package com.mesaro.reservation;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.billing.BillingService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.email.ReservationConfirmationEmailSender;
import com.mesaro.email.ReservationEmailData;
import com.mesaro.hold.Hold;
import com.mesaro.hold.HoldRepository;
import com.mesaro.hold.HoldService;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.outbox.OutboxService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableLockRepository;
import com.mesaro.user.UserRestaurant;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.Year;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/**
 * Service for managing reservations.
 */
@Service
public class ReservationService {

    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final ReservationRepository reservationRepository;
    private final HoldRepository holdRepository;
    private final DiningTableLockRepository tableLockRepository;
    private final HoldService holdService;
    private final TokenService tokenService;
    private final TimeService timeService;
    private final AuditService auditService;
    private final ReservationConfirmationEmailSender emailSender;
    private final EmailService emailService;
    private final ShiftRepository shiftRepository;
    private final RestaurantService restaurantService;
    private final BillingService billingService;
    private final MeterRegistry meterRegistry;
    @Autowired(required = false)
    private OutboxService outboxService;

    @Value("${app.reservation.cancel-token-ttl-days:7}")
    private int cancelTokenTtlDays;

    public ReservationService(
            ReservationRepository reservationRepository,
            HoldRepository holdRepository,
            DiningTableLockRepository tableLockRepository,
            HoldService holdService,
            TokenService tokenService,
            TimeService timeService,
            AuditService auditService,
            ReservationConfirmationEmailSender emailSender,
            EmailService emailService,
            ShiftRepository shiftRepository,
            RestaurantService restaurantService,
            BillingService billingService,
            MeterRegistry meterRegistry) {
        this.reservationRepository = reservationRepository;
        this.holdRepository = holdRepository;
        this.tableLockRepository = tableLockRepository;
        this.holdService = holdService;
        this.tokenService = tokenService;
        this.timeService = timeService;
        this.auditService = auditService;
        this.emailSender = emailSender;
        this.emailService = emailService;
        this.shiftRepository = shiftRepository;
        this.restaurantService = restaurantService;
        this.billingService = billingService;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Confirm a hold into a reservation.
     * This is an atomic operation that:
     * 1. Validates the hold token
     * 2. Locks the hold and tables
     * 3. Creates the reservation
     * 4. Invalidates the hold
     *
     * @param holdToken The raw hold token
     * @param request   Guest details
     * @return Confirmation result with cancel token
     */
    @Transactional
    public ConfirmationResult confirm(String holdToken, ConfirmHoldRequest request) {
        // Validate and get hold
        String tokenHash = tokenService.hashToken(holdToken);
        Hold hold = holdRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new NotFoundException("Hold not found"));

        // Idempotent check: if hold already confirmed, find the reservation
        if (hold.isConfirmed()) {
            log.info("Hold {} already confirmed, returning existing reservation", hold.getId());
            return findExistingConfirmation(hold);
        }

        // Check if expired
        Instant now = timeService.now();
        if (!hold.getExpiresAtUtc().isAfter(now)) {
            throw new ConflictException("Hold has expired");
        }

        Restaurant restaurant = restaurantService.findById(hold.getRestaurant().getId());
        restaurantService.assertCanAcceptBookings(restaurant);
        billingService.checkBillingAccess(restaurant);

        Shift shift = hold.getShift();
        if (shift == null) {
            throw new ConflictException("Hold is missing shift assignment");
        }
        Shift lockedShift = shiftRepository.findByIdForUpdate(shift.getId())
                .orElseThrow(() -> new NotFoundException("Shift", shift.getId()));

        // Lock tables in deterministic order
        List<Long> tableIds = hold.getTables().stream()
                .map(DiningTable::getId)
                .sorted()
                .toList();

        List<DiningTable> lockedTables = tableLockRepository.findByIdsForUpdate(tableIds);
        if (lockedTables.size() != tableIds.size()) {
            throw new ConflictException("One or more tables no longer available");
        }

        // Re-verify no overlapping reservations (double-check within lock)
        if (reservationRepository.existsActiveReservationForTables(
                tableIds, hold.getStartAtUtc(), hold.getEndAtUtc())) {
            throw new ConflictException("Table is no longer available");
        }
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        var localDate = hold.getStartAtUtc().atZone(timezone).toLocalDate();
        Instant dayStart = localDate.atStartOfDay(timezone).toInstant();
        Instant dayEnd = localDate.plusDays(1).atStartOfDay(timezone).toInstant();
        int currentCovers = reservationRepository.countCoversForShift(lockedShift.getId(), dayStart, dayEnd);
        int holdCovers = holdRepository.countActiveHoldCoversForShift(
                lockedShift.getId(), dayStart, dayEnd, timeService.now());
        if (currentCovers + holdCovers > lockedShift.getMaxCovers()) {
            throw new ConflictException("Shift capacity exceeded");
        }

        // Generate confirmation code and cancel token
        String confirmationCode = generateConfirmationCode();
        String cancelToken = tokenService.generateToken();
        String cancelTokenHash = tokenService.hashToken(cancelToken);
        Instant cancelTokenExpires = now.plus(cancelTokenTtlDays, ChronoUnit.DAYS);

        // Create reservation
        Reservation reservation = new Reservation(
                restaurant,
                hold.getShift(),
                confirmationCode,
                request.guestName(),
                request.guestEmail(),
                hold.getPartySize(),
                hold.getStartAtUtc(),
                hold.getEndAtUtc()
        );
        reservation.setGuestPhone(request.guestPhone());
        reservation.setNotes(request.notes());
        reservation.setStartLocalText(hold.getStartLocalText());
        reservation.setCancelTokenHash(cancelTokenHash);
        reservation.setCancelTokenExpiresAtUtc(cancelTokenExpires);
        reservation.addTables(new HashSet<>(lockedTables));

        Reservation saved = saveWithConfirmationCodeRetry(reservation);
        meterRegistry.counter("mesaro.reservations.created", "source", "ONLINE").increment();

        // Mark hold as confirmed
        holdService.markConfirmed(hold);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_CREATED,
                restaurant.getId(),
                null,
                saved.getId(),
                Map.of(
                        "confirmationCode", confirmationCode,
                        "source", "ONLINE",
                        "partySize", saved.getPartySize(),
                        "tableIds", tableIds
                )
        );

        log.info("Confirmed reservation {} for {} guests at restaurant {} on {}",
                confirmationCode, hold.getPartySize(), restaurant.getSlug(),
                hold.getStartAtUtc().atZone(ZoneId.of(restaurant.getTimezone())).toLocalDate());

        // Schedule confirmation email to be sent after transaction commits
        List<String> tableLabels = lockedTables.stream()
                .map(DiningTable::getLabel)
                .sorted()
                .toList();

        ReservationEmailData emailData = new ReservationEmailData(
                confirmationCode,
                saved.getGuestName(),
                saved.getGuestEmail(),
                saved.getPartySize(),
                saved.getStartAtUtc(),
                saved.getEndAtUtc(),
                restaurant.getTimezone(),
                restaurant.getName(),
                restaurant.getSlug(),
                tableLabels,
                cancelToken
        );
        if (outboxService != null) {
            outboxService.enqueue(
                    "RESERVATION",
                    saved.getId(),
                    "ReservationConfirmed",
                    emailData,
                    saved.getId() + ":confirmed"
            );
        } else {
            emailSender.sendAfterCommit(emailData);
        }

        return ConfirmationResult.from(saved, cancelToken, timezone);
    }

    /**
     * Find a reservation by confirmation code.
     */
    @Transactional(readOnly = true)
    public Reservation findByConfirmationCode(String confirmationCode) {
        Reservation reservation = reservationRepository.findByConfirmationCodeWithAssociations(confirmationCode)
                .orElseThrow(() -> new NotFoundException("Reservation not found"));
        return reservation;
    }

    /**
     * Find a public reservation by confirmation code and cancel token.
     * This prevents enumeration of reservation details by code alone.
     */
    @Transactional(readOnly = true)
    public Reservation findByCodeAndCancelToken(String confirmationCode, String cancelToken) {
        String tokenHash = tokenService.hashToken(cancelToken);
        return reservationRepository.findByConfirmationCodeAndCancelTokenHashWithAssociations(confirmationCode, tokenHash)
                .orElseThrow(() -> new NotFoundException("Reservation not found"));
    }

    /**
     * Find a reservation by ID.
     */
    @Transactional(readOnly = true)
    public Reservation findById(Long id) {
        return reservationRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new NotFoundException("Reservation", id));
    }

    /**
     * Cancel a reservation using the cancel token.
     */
    @Transactional
    public Reservation cancelByToken(String cancelToken) {
        String tokenHash = tokenService.hashToken(cancelToken);
        return cancelByTokenHash(tokenHash, "GUEST");
    }

    @Transactional
    public Reservation cancelByCodeAndToken(String confirmationCode, String cancelToken) {
        String tokenHash = tokenService.hashToken(cancelToken);
        Reservation reservation = reservationRepository.findByConfirmationCodeAndCancelTokenHashWithAssociations(
                        confirmationCode, tokenHash)
                .orElseThrow(() -> new NotFoundException("Reservation not found"));
        return cancelReservation(reservation, "GUEST");
    }

    private Reservation cancelByTokenHash(String tokenHash, String cancelledBy) {
        Reservation reservation = reservationRepository.findByCancelTokenHashWithAssociations(tokenHash)
                .orElseThrow(() -> new NotFoundException("Reservation not found"));
        return cancelReservation(reservation, cancelledBy);
    }

    private Reservation cancelReservation(Reservation reservation, String cancelledBy) {
        Instant now = timeService.now();
        boolean guestCancel = "GUEST".equalsIgnoreCase(cancelledBy);
        ReservationLifecycleRules.assertCanCancel(reservation, now, guestCancel);

        if (reservation.getCancelTokenExpiresAtUtc() != null &&
                !reservation.getCancelTokenExpiresAtUtc().isAfter(now)) {
            throw new ConflictException("Cancellation link has expired");
        }

        reservation.cancel();
        meterRegistry.counter("mesaro.reservations.cancelled", "by", cancelledBy).increment();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_CANCELLED,
                reservation.getRestaurant().getId(),
                null,
                reservation.getId(),
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "cancelledBy", cancelledBy
                )
        );

        log.info("Cancelled reservation {} by {}", reservation.getConfirmationCode(), cancelledBy.toLowerCase());
        notifyReservationCancelled(reservation, cancelledBy);
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Cancel a reservation by staff (no token needed).
     */
    @Transactional
    public Reservation cancelByStaff(Long reservationId) {
        Reservation reservation = findById(reservationId);
        return cancelReservation(reservation, "STAFF");
    }

    /**
     * Mark a reservation as seated.
     */
    @Transactional
    public Reservation seat(Long reservationId) {
        Reservation reservation = findById(reservationId);
        ZoneId timezone = ZoneId.of(reservation.getRestaurant().getTimezone());
        ReservationLifecycleRules.assertCanSeat(reservation, timeService.now(), timezone);

        reservation.seat();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_SEATED,
                reservation.getRestaurant().getId(),
                null,
                reservation.getId(),
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "seatedAt", timeService.now().toString()
                )
        );

        log.info("Seated reservation {}", reservation.getConfirmationCode());
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Mark a reservation as completed.
     */
    @Transactional
    public Reservation complete(Long reservationId) {
        Reservation reservation = findById(reservationId);
        ReservationLifecycleRules.assertCanComplete(reservation);

        reservation.complete();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_COMPLETED,
                reservation.getRestaurant().getId(),
                null,
                reservation.getId(),
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "completedAt", timeService.now().toString()
                )
        );

        log.info("Completed reservation {}", reservation.getConfirmationCode());
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Mark a reservation as no-show.
     */
    @Transactional
    public Reservation markNoShow(Long reservationId) {
        Reservation reservation = findById(reservationId);
        ReservationLifecycleRules.assertCanMarkNoShow(reservation, timeService.now());

        reservation.markNoShow();
        meterRegistry.counter("mesaro.reservations.no_show").increment();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_NO_SHOW,
                reservation.getRestaurant().getId(),
                null,
                reservation.getId(),
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "markedAt", timeService.now().toString()
                )
        );

        log.info("Marked reservation {} as no-show", reservation.getConfirmationCode());
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Find reservations for a restaurant on a date range.
     */
    @Transactional(readOnly = true)
    public List<Reservation> findByRestaurantAndDateRange(Long restaurantId, Instant startUtc, Instant endUtc) {
        return reservationRepository.findByRestaurantAndDateRangeWithAssociations(restaurantId, startUtc, endUtc);
    }

    private String generateConfirmationCode() {
        int year = Year.now().getValue();
        for (int attempts = 0; attempts < 10; attempts++) {
            String code = "RES-" + year + "-" + randomCodeSuffix(8);
            if (!reservationRepository.existsByConfirmationCode(code)) {
                return code;
            }
        }
        return "RES-" + year + "-" + randomCodeSuffix(10);
    }

    private ConfirmationResult findExistingConfirmation(Hold hold) {
        // Find reservation that was created from this hold
        // We match by restaurant, time, and tables
        List<Long> tableIds = hold.getTables().stream()
                .map(DiningTable::getId)
                .sorted()
                .toList();

        List<Reservation> candidates = reservationRepository.findByRestaurantAndDateRange(
                hold.getRestaurant().getId(),
                hold.getStartAtUtc(),
                hold.getStartAtUtc().plusSeconds(1)
        );

        for (Reservation r : candidates) {
            List<Long> reservationTableIds = r.getTables().stream()
                    .map(DiningTable::getId)
                    .sorted()
                    .toList();

            if (reservationTableIds.equals(tableIds) &&
                    r.getPartySize() == hold.getPartySize() &&
                    r.getStartAtUtc().equals(hold.getStartAtUtc())) {
                // Found matching reservation. Re-issue a cancel token so retry callers
                // can still manage their reservation if the original response was lost.
                String reissuedCancelToken = reissueCancelToken(r);
                ZoneId timezone = ZoneId.of(hold.getRestaurant().getTimezone());
                return ConfirmationResult.from(r, reissuedCancelToken, timezone);
            }
        }

        throw new ConflictException("Hold was confirmed but reservation not found");
    }

    private String randomCodeSuffix(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int index = RANDOM.nextInt(CODE_ALPHABET.length());
            builder.append(CODE_ALPHABET.charAt(index));
        }
        return builder.toString();
    }

    private String reissueCancelToken(Reservation reservation) {
        Instant now = timeService.now();
        String cancelToken = tokenService.generateToken();
        reservation.setCancelTokenHash(tokenService.hashToken(cancelToken));
        reservation.setCancelTokenExpiresAtUtc(now.plus(cancelTokenTtlDays, ChronoUnit.DAYS));
        reservationRepository.save(reservation);
        return cancelToken;
    }

    private Reservation saveWithConfirmationCodeRetry(Reservation reservation) {
        for (int attempt = 0; attempt < 5; attempt++) {
            try {
                return reservationRepository.save(reservation);
            } catch (DataIntegrityViolationException ex) {
                if (ex.getMessage() != null && ex.getMessage().contains("confirmation_code")) {
                    reservation.setConfirmationCode(generateConfirmationCode());
                } else {
                    throw ex;
                }
            }
        }
        throw new ConflictException("Could not generate a unique confirmation code");
    }

    private void notifyReservationCancelled(Reservation reservation, String cancelledBy) {
        String guestEmail = reservation.getGuestEmail();
        if (guestEmail == null || guestEmail.isBlank()) {
            return;
        }
        try {
            emailService.sendReservationCancelled(
                    guestEmail,
                    reservation.getGuestName(),
                    reservation.getRestaurant().getName(),
                    reservation.getConfirmationCode(),
                    cancelledBy
            );
        } catch (Exception ex) {
            log.warn("Failed to send reservation cancelled notification for {}",
                    reservation.getConfirmationCode());
        }
    }

}
