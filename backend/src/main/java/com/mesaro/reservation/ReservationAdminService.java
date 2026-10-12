package com.mesaro.reservation;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.availability.TableSelectionResult;
import com.mesaro.availability.TableSelectionService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.PreconditionFailedException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.restaurant.AssignmentMode;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantAccessGuard;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableLockRepository;
import com.mesaro.table.DiningTableService;
import com.mesaro.table.TableCombination;
import com.mesaro.table.TableCombinationRepository;
import com.mesaro.table.TableStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Admin service for reservation management.
 * Includes audit logging for all operations.
 */
@Service
public class ReservationAdminService {

    private static final Logger log = LoggerFactory.getLogger(ReservationAdminService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final RestaurantService restaurantService;
    private final DiningTableService tableService;
    private final DiningTableLockRepository tableLockRepository;
    private final ShiftRepository shiftRepository;
    private final TableSelectionService tableSelectionService;
    private final HoldRepository holdRepository;
    private final TableCombinationRepository combinationRepository;
    private final RestaurantAccessGuard restaurantAccessGuard;
    private final AuditService auditService;
    private final TimeService timeService;
    private final EmailService emailService;

    public ReservationAdminService(
            ReservationRepository reservationRepository,
            ReservationService reservationService,
            RestaurantService restaurantService,
            DiningTableService tableService,
            DiningTableLockRepository tableLockRepository,
            ShiftRepository shiftRepository,
            TableSelectionService tableSelectionService,
            HoldRepository holdRepository,
            TableCombinationRepository combinationRepository,
            RestaurantAccessGuard restaurantAccessGuard,
            AuditService auditService,
            TimeService timeService,
            EmailService emailService) {
        this.reservationRepository = reservationRepository;
        this.reservationService = reservationService;
        this.restaurantService = restaurantService;
        this.tableService = tableService;
        this.tableLockRepository = tableLockRepository;
        this.shiftRepository = shiftRepository;
        this.tableSelectionService = tableSelectionService;
        this.holdRepository = holdRepository;
        this.combinationRepository = combinationRepository;
        this.restaurantAccessGuard = restaurantAccessGuard;
        this.auditService = auditService;
        this.timeService = timeService;
        this.emailService = emailService;
    }

    /**
     * List reservations for a restaurant with filters.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public List<Reservation> listReservations(Long restaurantId, ReservationListRequest request) {
        Restaurant restaurant = restaurantService.findOperationalById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        LocalDate startDate;
        LocalDate endDate;

        if (request.date() != null) {
            startDate = request.date();
            endDate = request.date();
        } else if (request.startDate() != null && request.endDate() != null) {
            startDate = request.startDate();
            endDate = request.endDate();
        } else {
            // Default to today
            startDate = timeService.today(timezone);
            endDate = startDate;
        }

        Instant startUtc = startDate.atStartOfDay(timezone).toInstant();
        Instant endUtc = endDate.plusDays(1).atStartOfDay(timezone).toInstant();

        if (request.statuses() != null && !request.statuses().isEmpty()) {
            List<Reservation> reservations = reservationRepository.findByRestaurantAndDateRangeAndStatusWithAssociations(
                    restaurantId, startUtc, endUtc, request.statuses());
            return reservations;
        }

        List<Reservation> reservations = reservationRepository.findByRestaurantAndDateRangeWithAssociations(
                restaurantId, startUtc, endUtc);
        return reservations;
    }

    /**
     * Get a single reservation.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation getReservation(Long restaurantId, Long reservationId) {
        Reservation reservation = reservationService.findById(reservationId);
        validateRestaurantAccess(reservation, restaurantId);
        return reservation;
    }

    /**
     * Create a walk-in reservation.
     */
    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation createWalkIn(Long restaurantId, AdminReservationCreateRequest request, Long userId) {
        Restaurant restaurant = restaurantService.findOperationalById(restaurantId);
        restaurantService.assertCanAcceptBookings(restaurant);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        Instant now = timeService.now();
        Instant startUtc = timeService.toUtcStrict(request.date(), request.time(), timezone, request.utcOffsetMinutes());
        if (startUtc == null) {
            startUtc = timeService.toUtc(request.date(), request.time(), timezone);
        }
        int durationMinutes = request.durationMinutes() != null
                ? request.durationMinutes()
                : restaurant.getDefaultDurationMinutes();
        Instant endUtc = startUtc.plus(durationMinutes, ChronoUnit.MINUTES);

        if (startUtc.isBefore(now.minusSeconds(59))) {
            throw new ValidationException("Cannot create reservation for past time", "time");
        }

        DayOfWeek dayOfWeek = request.date().getDayOfWeek();
        int dayValue = dayOfWeek.getValue();
        int previousDay = dayValue == 1 ? 7 : dayValue - 1;
        List<Shift> activeShifts = shiftRepository.findActiveShiftAtTimeIncludingOvernight(
                        restaurantId, dayValue, previousDay, request.time())
                .stream()
                .filter(shift -> shift.isReservableAt(dayValue, request.time()))
                .toList();

        if (activeShifts.isEmpty()) {
            throw new ValidationException("No active shift at this time", "time");
        }

        Shift shift = activeShifts.get(0);
        shift = enforceShiftCapacity(shift, request.date(), timezone, request.partySize());

        TableAssignment assignment = resolveTablesForCreate(restaurant, request, startUtc, endUtc, now);

        String confirmationCode = generateConfirmationCode();
        String guestEmail = normalizeGuestEmail(request.guestEmail());

        Reservation reservation = new Reservation(
                restaurant,
                shift,
                confirmationCode,
                request.guestName(),
                guestEmail,
                request.partySize(),
                startUtc,
                endUtc
        );
        reservation.setGuestPhone(request.guestPhone());
        reservation.setNotes(request.notes());
        reservation.setStartLocalText(request.date() + "T" + request.time().withSecond(0).withNano(0));
        reservation.addTables(assignment.tables());
        if (Boolean.TRUE.equals(request.seatImmediately())) {
            reservation.seat();
        }

        Reservation saved = saveWithConfirmationCodeRetry(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_CREATED,
                restaurantId,
                userId,
                saved.getId(),
                Map.of(
                        "confirmationCode", confirmationCode,
                        "source", "WALK_IN",
                        "partySize", request.partySize(),
                        "tableIds", assignment.tableIds()
                )
        );

        log.info("Created walk-in reservation {} for {} guests at restaurant {}",
                confirmationCode, request.partySize(), restaurantId);
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Update reservation guest details and notes.
     */
    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation updateReservation(Long restaurantId, Long reservationId,
                                         AdminReservationUpdateRequest request, Long userId, long expectedVersion) {
        Reservation reservation = getReservation(restaurantId, reservationId);
        assertVersionMatch(reservation, expectedVersion);

        if (request.guestName() != null) {
            String guestName = request.guestName().trim();
            if (guestName.isEmpty()) {
                throw new ValidationException("Guest name is required", "guestName");
            }
            reservation.setGuestName(guestName);
        }

        if (request.guestEmail() != null) {
            reservation.setGuestEmail(request.guestEmail());
        }

        if (request.guestPhone() != null) {
            reservation.setGuestPhone(request.guestPhone());
        }

        if (request.notes() != null) {
            reservation.setNotes(request.notes());
        }

        TableSwitchOutcome tableOutcome = null;
        if (request.tableIds() != null || request.combinationId() != null) {
            if (!hasAtLeastManagerRole(restaurantId)) {
                throw new org.springframework.security.access.AccessDeniedException("Insufficient permissions");
            }
            tableOutcome = applyTableSwitch(reservation, restaurantId, request.tableIds(), request.combinationId());
            reservation = tableOutcome.reservation();
        }

        Reservation saved = reservationRepository.save(reservation);

        Map<String, Object> details = new HashMap<>();
        details.put("confirmationCode", reservation.getConfirmationCode());
        if (request.guestName() != null) {
            details.put("guestName", reservation.getGuestName());
        }
        if (request.guestEmail() != null) {
            details.put("guestEmail", reservation.getGuestEmail());
        }
        if (request.guestPhone() != null) {
            details.put("guestPhone", reservation.getGuestPhone());
        }
        if (request.notes() != null) {
            details.put("notes", reservation.getNotes());
        }
        if (tableOutcome != null) {
            details.put("previousTableIds", tableOutcome.previousTableIds());
            details.put("newTableIds", tableOutcome.newTableIds());
        }

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_UPDATED,
                restaurantId,
                userId,
                reservationId,
                details
        );

        log.info("Updated reservation {} by user {}", reservation.getConfirmationCode(), userId);
        notifyReservationUpdated(saved);
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Cancel a reservation (admin action).
     */
    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation cancel(Long restaurantId, Long reservationId, Long userId, long expectedVersion) {
        Reservation reservation = getReservation(restaurantId, reservationId);
        assertVersionMatch(reservation, expectedVersion);

        if (!reservation.isCancellable()) {
            throw new ConflictException("Reservation cannot be cancelled in status: " + reservation.getStatus());
        }

        ReservationStatus previousStatus = reservation.getStatus();
        reservation.cancel();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_CANCELLED,
                restaurantId,
                userId,
                reservationId,
                Map.of(
                        "previousStatus", previousStatus.name(),
                        "cancelledBy", "ADMIN",
                        "confirmationCode", reservation.getConfirmationCode()
                )
        );

        log.info("Admin cancelled reservation {} by user {}", reservation.getConfirmationCode(), userId);
        notifyReservationCancelled(saved, "ADMIN");
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Mark a reservation as seated.
     */
    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation seat(Long restaurantId, Long reservationId, Long userId, long expectedVersion) {
        Reservation reservation = getReservation(restaurantId, reservationId);
        assertVersionMatch(reservation, expectedVersion);

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ConflictException("Can only seat CONFIRMED reservations, current status: " + reservation.getStatus());
        }

        reservation.seat();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_SEATED,
                restaurantId,
                userId,
                reservationId,
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "seatedAt", timeService.now().toString()
                )
        );

        log.info("Seated reservation {} by user {}", reservation.getConfirmationCode(), userId);
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Mark a reservation as completed.
     */
    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation complete(Long restaurantId, Long reservationId, Long userId, long expectedVersion) {
        Reservation reservation = getReservation(restaurantId, reservationId);
        assertVersionMatch(reservation, expectedVersion);

        if (reservation.getStatus() != ReservationStatus.SEATED) {
            throw new ConflictException("Can only complete SEATED reservations, current status: " + reservation.getStatus());
        }

        reservation.complete();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_COMPLETED,
                restaurantId,
                userId,
                reservationId,
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "completedAt", timeService.now().toString()
                )
        );

        log.info("Completed reservation {} by user {}", reservation.getConfirmationCode(), userId);
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Mark a reservation as no-show.
     */
    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation markNoShow(Long restaurantId, Long reservationId, Long userId, long expectedVersion) {
        Reservation reservation = getReservation(restaurantId, reservationId);
        assertVersionMatch(reservation, expectedVersion);

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ConflictException("Can only mark CONFIRMED reservations as no-show, current status: " + reservation.getStatus());
        }

        reservation.markNoShow();
        Reservation saved = reservationRepository.save(reservation);

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_NO_SHOW,
                restaurantId,
                userId,
                reservationId,
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "markedAt", timeService.now().toString()
                )
        );

        log.info("Marked reservation {} as no-show by user {}", reservation.getConfirmationCode(), userId);
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    /**
     * Switch tables for a reservation.
     */
    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Reservation switchTables(Long restaurantId, Long reservationId, SwitchTablesRequest request, Long userId, long expectedVersion) {
        Reservation reservation = getReservation(restaurantId, reservationId);
        assertVersionMatch(reservation, expectedVersion);
        TableSwitchOutcome outcome = applyTableSwitch(reservation, restaurantId, request.tableIds(), request.combinationId());
        Reservation saved = outcome.reservation();

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_TABLE_SWITCHED,
                restaurantId,
                userId,
                reservationId,
                Map.of(
                        "confirmationCode", reservation.getConfirmationCode(),
                        "previousTableIds", outcome.previousTableIds(),
                        "newTableIds", outcome.newTableIds()
                )
        );

        log.info("Switched tables for reservation {} from {} to {} by user {}",
                reservation.getConfirmationCode(), outcome.previousTableIds(), outcome.newTableIds(), userId);
        return reservationRepository.findByIdWithAssociations(saved.getId())
                .orElseThrow(() -> new NotFoundException("Reservation", saved.getId()));
    }

    private void validateRestaurantAccess(Reservation reservation, Long restaurantId) {
        if (!reservation.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("Reservation", reservation.getId());
        }
    }

    private Shift enforceShiftCapacity(Shift shift, LocalDate date, ZoneId timezone, int partySize) {
        Shift lockedShift = shiftRepository.findByIdForUpdate(shift.getId())
                .orElseThrow(() -> new NotFoundException("Shift", shift.getId()));
        Instant startUtc = date.atStartOfDay(timezone).toInstant();
        Instant endUtc = date.plusDays(1).atStartOfDay(timezone).toInstant();
        int currentCovers = reservationRepository.countCoversForShift(lockedShift.getId(), startUtc, endUtc);

        if (currentCovers + partySize > lockedShift.getMaxCovers()) {
            throw new ConflictException("Shift capacity exceeded");
        }
        return lockedShift;
    }

    private TableAssignment resolveTablesForCreate(Restaurant restaurant, AdminReservationCreateRequest request,
                                                   Instant startUtc, Instant endUtc, Instant now) {
        if ((request.tableIds() != null && !request.tableIds().isEmpty()) || request.combinationId() != null) {
            List<Long> tableIds = resolveManualTableIds(restaurant.getId(), request.tableIds(), request.combinationId());
            return assignManualTables(restaurant.getId(), tableIds, request.partySize(), startUtc, endUtc, now);
        }

        if (restaurant.getAssignmentMode() == AssignmentMode.MANUAL) {
            List<Long> tableIds = resolveManualTableIds(restaurant.getId(), request.tableIds(), request.combinationId());
            return assignManualTables(restaurant.getId(), tableIds, request.partySize(), startUtc, endUtc, now);
        }

        TableSelectionResult selection = tableSelectionService.findBestMatch(
                restaurant, request.partySize(), startUtc, endUtc);

        if (!selection.isMatch()) {
            String reason = switch (selection) {
                case TableSelectionResult.NoMatch noMatch -> noMatch.reason();
                default -> "No available table";
            };
            throw new ConflictException(reason);
        }

        List<Long> tableIds = getTableIds(selection).stream().sorted().toList();
        List<DiningTable> lockedTables = tableLockRepository.findByIdsForUpdate(tableIds);
        if (lockedTables.size() != tableIds.size()) {
            throw new ConflictException("One or more tables no longer available");
        }

        if (reservationRepository.existsActiveReservationForTables(tableIds, startUtc, endUtc)) {
            throw new ConflictException("One or more tables are already reserved for this time");
        }
        if (holdRepository.existsActiveHoldForTables(tableIds, startUtc, endUtc, now)) {
            throw new ConflictException("One or more tables are currently held");
        }

        return new TableAssignment(new HashSet<>(lockedTables), tableIds);
    }

    private TableAssignment assignManualTables(Long restaurantId, List<Long> requestedTableIds, int partySize,
                                               Instant startUtc, Instant endUtc, Instant now) {
        List<Long> tableIds = requestedTableIds.stream().sorted().toList();
        if (tableIds.size() != new HashSet<>(tableIds).size()) {
            throw new ValidationException("Duplicate table IDs are not allowed", "tableIds");
        }

        int totalSeats = 0;
        for (Long tableId : tableIds) {
            DiningTable table = tableService.findByIdAndRestaurant(tableId, restaurantId);
            if (table.getStatus() != TableStatus.AVAILABLE) {
                throw new ValidationException("Table is not available: " + table.getLabel(), "tableIds");
            }
            totalSeats += table.getSeats();
        }

        if (totalSeats < partySize) {
            throw new ValidationException(
                    "Selected tables have insufficient capacity (" + totalSeats + " seats) for party of " + partySize,
                    "tableIds"
            );
        }

        List<DiningTable> lockedTables = tableLockRepository.findByIdsForUpdate(tableIds);
        if (lockedTables.size() != tableIds.size()) {
            throw new ConflictException("One or more tables no longer available");
        }

        if (reservationRepository.existsActiveReservationForTables(tableIds, startUtc, endUtc)) {
            throw new ConflictException("One or more tables are already reserved for this time");
        }
        if (holdRepository.existsActiveHoldForTables(tableIds, startUtc, endUtc, now)) {
            throw new ConflictException("One or more tables are currently held");
        }

        return new TableAssignment(new HashSet<>(lockedTables), tableIds);
    }

    private TableSwitchOutcome applyTableSwitch(Reservation reservation, Long restaurantId,
                                                List<Long> requestedTableIds, Long combinationId) {
        if (!reservation.isActive()) {
            throw new ConflictException("Can only switch tables for active reservations");
        }
        List<Long> tableIds = resolveManualTableIds(restaurantId, requestedTableIds, combinationId);

        List<Long> currentTableIds = reservation.getTables().stream()
                .map(DiningTable::getId)
                .sorted()
                .toList();
        List<Long> newTableIds = tableIds.stream().sorted().toList();
        if (newTableIds.size() != new HashSet<>(newTableIds).size()) {
            throw new ValidationException("Duplicate table IDs are not allowed", "tableIds");
        }

        int totalSeats = 0;
        for (Long tableId : newTableIds) {
            DiningTable table = tableService.findByIdAndRestaurant(tableId, restaurantId);
            if (table.getStatus() != TableStatus.AVAILABLE) {
                throw new ValidationException("Table is not available: " + table.getLabel(), "tableIds");
            }
            totalSeats += table.getSeats();
        }

        if (totalSeats < reservation.getPartySize()) {
            throw new ValidationException(
                    "New tables have insufficient capacity (" + totalSeats + " seats) for party of " + reservation.getPartySize(),
                    "tableIds"
            );
        }

        List<DiningTable> lockedTables = tableLockRepository.findByIdsForUpdate(newTableIds);
        if (lockedTables.size() != newTableIds.size()) {
            throw new ConflictException("One or more tables no longer available");
        }

        boolean hasConflict = reservationRepository.existsActiveReservationForTables(
                newTableIds, reservation.getStartAtUtc(), reservation.getEndAtUtc());

        if (hasConflict) {
            Set<Long> conflictingTableIds = reservationRepository.findTableIdsWithOverlappingReservations(
                    newTableIds, reservation.getStartAtUtc(), reservation.getEndAtUtc());
            conflictingTableIds.removeAll(currentTableIds);
            if (!conflictingTableIds.isEmpty()) {
                throw new ConflictException("One or more tables are already reserved for this time");
            }
        }

        Instant now = timeService.now();
        if (holdRepository.existsActiveHoldForTables(newTableIds, reservation.getStartAtUtc(), reservation.getEndAtUtc(), now)) {
            throw new ConflictException("One or more tables are currently held");
        }

        reservation.getTables().clear();
        reservation.addTables(new HashSet<>(lockedTables));

        Reservation saved = reservationRepository.save(reservation);
        return new TableSwitchOutcome(saved, currentTableIds, newTableIds);
    }

    private List<Long> resolveManualTableIds(Long restaurantId, List<Long> tableIds, Long combinationId) {
        if (combinationId != null) {
            if (tableIds != null && !tableIds.isEmpty()) {
                throw new ValidationException("Choose either tableIds or combinationId, not both", "tableIds");
            }
            TableCombination combination = combinationRepository.findByIdWithRestaurantAndTables(combinationId)
                    .orElseThrow(() -> new NotFoundException("TableCombination", combinationId));
            if (!combination.getRestaurant().getId().equals(restaurantId)) {
                throw new ValidationException("Combination does not belong to this restaurant", "combinationId");
            }
            return combination.getTables().stream().map(DiningTable::getId).toList();
        }

        if (tableIds == null || tableIds.isEmpty()) {
            throw new ValidationException("At least one table ID is required", "tableIds");
        }
        return tableIds;
    }

    private List<Long> getTableIds(TableSelectionResult selection) {
        return switch (selection) {
            case TableSelectionResult.SingleTable s -> List.of(s.table().getId());
            case TableSelectionResult.Combination c -> c.combination().getTables().stream()
                    .map(DiningTable::getId)
                    .toList();
            case TableSelectionResult.NoMatch n -> List.of();
        };
    }

    private String normalizeGuestEmail(String guestEmail) {
        if (guestEmail == null || guestEmail.isBlank()) {
            return "";
        }
        return guestEmail;
    }

    private String generateConfirmationCode() {
        int year = java.time.Year.now().getValue();
        for (int attempts = 0; attempts < 10; attempts++) {
            String code = "RES-" + year + "-" + randomCodeSuffix(8);
            if (!reservationRepository.existsByConfirmationCode(code)) {
                return code;
            }
        }
        return "RES-" + year + "-" + randomCodeSuffix(10);
    }

    private String randomCodeSuffix(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int index = RANDOM.nextInt(CODE_ALPHABET.length());
            builder.append(CODE_ALPHABET.charAt(index));
        }
        return builder.toString();
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

    private boolean hasAtLeastManagerRole(Long restaurantId) {
        return restaurantAccessGuard.hasAtLeastRole(restaurantId, "MANAGER");
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
            log.warn("Failed to send admin cancellation email for reservation {}",
                    reservation.getConfirmationCode());
        }
    }

    private void notifyReservationUpdated(Reservation reservation) {
        String guestEmail = reservation.getGuestEmail();
        if (guestEmail == null || guestEmail.isBlank()) {
            return;
        }
        try {
            emailService.sendReservationUpdated(
                    guestEmail,
                    reservation.getGuestName(),
                    reservation.getRestaurant().getName(),
                    reservation.getConfirmationCode()
            );
        } catch (Exception ex) {
            log.warn("Failed to send reservation updated email for reservation {}",
                    reservation.getConfirmationCode());
        }
    }

    private record TableAssignment(Set<DiningTable> tables, List<Long> tableIds) {}

    private record TableSwitchOutcome(Reservation reservation, List<Long> previousTableIds, List<Long> newTableIds) {}

    private void assertVersionMatch(Reservation reservation, long expectedVersion) {
        if (reservation.getVersion() != expectedVersion) {
            throw new PreconditionFailedException("Reservation version is stale. Fetch latest representation and retry with latest ETag.", "If-Match");
        }
    }
}
