package com.mesaro.hold;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.availability.TableSelectionResult;
import com.mesaro.availability.TableSelectionService;
import com.mesaro.billing.BillingService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableLockRepository;
import com.mesaro.vacation.VacationService;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Service for creating and managing holds.
 * Uses pessimistic locking to prevent race conditions.
 */
@Service
public class HoldService {

    private static final Logger log = LoggerFactory.getLogger(HoldService.class);

    private final HoldRepository holdRepository;
    private final DiningTableLockRepository tableLockRepository;
    private final ShiftRepository shiftRepository;
    private final RestaurantService restaurantService;
    private final BillingService billingService;
    private final TableSelectionService tableSelectionService;
    private final VacationService vacationService;
    private final ReservationRepository reservationRepository;
    private final TokenService tokenService;
    private final TimeService timeService;
    private final AuditService auditService;
    private final MeterRegistry meterRegistry;
    @Value("${app.hold.duration-minutes:3}")
    private int holdDurationMinutes;

    public HoldService(
            HoldRepository holdRepository,
            DiningTableLockRepository tableLockRepository,
            ShiftRepository shiftRepository,
            RestaurantService restaurantService,
            BillingService billingService,
            TableSelectionService tableSelectionService,
            VacationService vacationService,
            ReservationRepository reservationRepository,
            TokenService tokenService,
            TimeService timeService,
            AuditService auditService,
            MeterRegistry meterRegistry) {
        this.holdRepository = holdRepository;
        this.tableLockRepository = tableLockRepository;
        this.shiftRepository = shiftRepository;
        this.restaurantService = restaurantService;
        this.billingService = billingService;
        this.tableSelectionService = tableSelectionService;
        this.vacationService = vacationService;
        this.reservationRepository = reservationRepository;
        this.tokenService = tokenService;
        this.timeService = timeService;
        this.auditService = auditService;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Create a new hold with pessimistic locking.
     * This is the critical section that prevents double-booking.
     *
     * @param request Hold creation request
     * @return Tuple of (Hold, raw token)
     */
    @Transactional
    public HoldWithToken createHold(CreateHoldRequest request) {
        Restaurant restaurant = restaurantService.findBySlug(request.restaurantSlug());
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        restaurantService.assertCanAcceptBookings(restaurant);
        billingService.checkBillingAccess(restaurant);

        // Validate not closed
        if (vacationService.isRestaurantClosed(restaurant.getId(), request.date())) {
            throw new ValidationException("Restaurant is closed on this date");
        }

        LocalDate today = timeService.today(timezone);
        if (request.date().isAfter(today.plusDays(restaurant.getMaxAdvanceDays()))) {
            throw new ValidationException(
                    "Cannot create hold more than " + restaurant.getMaxAdvanceDays() + " days in advance",
                    "date"
            );
        }

        if (request.partySize() > restaurant.getMaxPartySize()) {
            throw new ValidationException(
                    "Party size must not exceed " + restaurant.getMaxPartySize(),
                    "partySize"
            );
        }

        // Calculate times
        Instant now = timeService.now();
        Instant startUtc = timeService.toUtcStrict(request.date(), request.time(), timezone, request.utcOffsetMinutes());
        if (startUtc == null) {
            startUtc = timeService.toUtc(request.date(), request.time(), timezone);
        }
        Instant endUtc = startUtc.plus(restaurant.getDefaultDurationMinutes(), ChronoUnit.MINUTES);
        Instant expiresAt = now.plus(holdDurationMinutes, ChronoUnit.MINUTES);

        // Validate not in the past
        if (startUtc.isBefore(now)) {
            throw new ValidationException("Cannot create hold for past time", "time");
        }

        if (restaurant.getMinNoticeMinutes() > 0 &&
                startUtc.isBefore(now.plus(restaurant.getMinNoticeMinutes(), ChronoUnit.MINUTES))) {
            throw new ValidationException(
                    "Minimum notice is " + restaurant.getMinNoticeMinutes() + " minutes",
                    "time"
            );
        }

        // Find the shift for this time
        DayOfWeek dayOfWeek = request.date().getDayOfWeek();
        int dayValue = dayOfWeek.getValue();
        int previousDay = dayValue == 1 ? 7 : dayValue - 1;
        List<Shift> activeShifts = shiftRepository.findActiveShiftAtTimeIncludingOvernight(
                        restaurant.getId(), dayValue, previousDay, request.time())
                .stream()
                .filter(shift -> shift.isReservableAt(dayValue, request.time()))
                .toList();

        if (activeShifts.isEmpty()) {
            throw new ValidationException("No active shift at this time", "time");
        }
        Shift shift = activeShifts.get(0);
        enforceShiftCapacity(shift, request.date(), timezone, request.partySize());

        // Find best table match (this does NOT lock yet)
        TableSelectionResult selection = tableSelectionService.findBestMatch(
                restaurant, request.partySize(), startUtc, endUtc);

        if (!selection.isMatch()) {
            String reason = switch (selection) {
                case TableSelectionResult.NoMatch noMatch -> noMatch.reason();
                default -> "No available table";
            };
            throw new ConflictException(reason);
        }

        // Get table IDs and sort for lock ordering
        List<Long> tableIds = getTableIds(selection).stream().sorted().toList();

        // === CRITICAL SECTION: Acquire locks in deterministic order ===
        List<DiningTable> lockedTables = tableLockRepository.findByIdsForUpdate(tableIds);

        // Verify we got all the tables we expected
        if (lockedTables.size() != tableIds.size()) {
            throw new ConflictException("One or more tables no longer available");
        }

        // Re-check for overlapping holds (within lock)
        if (holdRepository.existsActiveHoldForTables(tableIds, startUtc, endUtc, now)) {
            throw new ConflictException("Table held by another guest");
        }

        // Re-check for overlapping active reservations (within lock)
        if (reservationRepository.existsActiveReservationForTables(tableIds, startUtc, endUtc)) {
            throw new ConflictException("Table is no longer available");
        }

        // Generate token
        String rawToken = tokenService.generateToken();
        String tokenHash = tokenService.hashToken(rawToken);

        // Create hold
        Hold hold = new Hold(restaurant, tokenHash, request.partySize(), startUtc, endUtc, shift, expiresAt);
        hold.setStartLocalText(request.date() + "T" + request.time().withSecond(0).withNano(0));
        hold.addTables(new HashSet<>(lockedTables));

        Hold saved = holdRepository.save(hold);
        meterRegistry.counter("mesaro.holds.created", "restaurant", restaurant.getSlug()).increment();
        log.info("Created hold {} for {} guests at restaurant {} on {} at {}",
                saved.getId(), request.partySize(), restaurant.getSlug(), request.date(), request.time());

        auditService.record(
                AuditEventType.HOLD_CREATED,
                restaurant.getId(),
                null,
                saved.getId(),
                "HOLD",
                Map.of(
                        "partySize", saved.getPartySize(),
                        "startAtUtc", saved.getStartAtUtc(),
                        "endAtUtc", saved.getEndAtUtc(),
                        "tableIds", tableIds
                )
        );

        return new HoldWithToken(saved, rawToken);
    }

    /**
     * Find a hold by its raw token.
     */
    @Transactional(readOnly = true)
    public Optional<Hold> findByToken(String token) {
        String tokenHash = tokenService.hashToken(token);
        return holdRepository.findByTokenHash(tokenHash);
    }

    /**
     * Find an active (non-expired, non-confirmed) hold by token.
     */
    @Transactional(readOnly = true)
    public Hold findActiveByToken(String token) {
        String tokenHash = tokenService.hashToken(token);
        Hold hold = holdRepository.findActiveByTokenHash(tokenHash)
                .orElseThrow(() -> new NotFoundException("Hold not found or expired"));

        if (!hold.getExpiresAtUtc().isAfter(timeService.now())) {
            throw new ConflictException("Hold has expired");
        }

        return hold;
    }

    /**
     * Mark a hold as confirmed (called during reservation creation).
     */
    @Transactional
    public void markConfirmed(Hold hold) {
        hold.markConfirmed();
        holdRepository.save(hold);
        log.info("Marked hold {} as confirmed", hold.getId());

        auditService.record(
                AuditEventType.HOLD_CONFIRMED,
                hold.getRestaurant().getId(),
                null,
                hold.getId(),
                "HOLD",
                Map.of("confirmedAt", timeService.now())
        );
    }

    /**
     * Clean up expired holds.
     */
    @Transactional
    public int cleanupExpiredHolds() {
        Instant cutoff = timeService.now();
        List<HoldRepository.ExpiredHoldDeletion> deletedRows = holdRepository.deleteExpiredHoldsSkipLocked(cutoff);
        int deleted = deletedRows.size();
        if (deleted > 0) {
            log.info("Cleaned up {} expired holds", deleted);
            meterRegistry.counter("mesaro.holds.expired").increment(deleted);
        }
        for (HoldRepository.ExpiredHoldDeletion hold : deletedRows) {
            auditService.record(
                    AuditEventType.HOLD_EXPIRED,
                    hold.getRestaurantId(),
                    null,
                    hold.getId(),
                    "HOLD",
                    Map.of(
                            "expiredAt", cutoff,
                            "startAtUtc", hold.getStartAtUtc(),
                            "endAtUtc", hold.getEndAtUtc()
                    )
            );
        }
        return deleted;
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

    private void enforceShiftCapacity(Shift shift, LocalDate date, ZoneId timezone, int partySize) {
        Shift lockedShift = shiftRepository.findByIdForUpdate(shift.getId())
                .orElseThrow(() -> new NotFoundException("Shift", shift.getId()));
        Instant startUtc = date.atStartOfDay(timezone).toInstant();
        Instant endUtc = date.plusDays(1).atStartOfDay(timezone).toInstant();
        int currentCovers = reservationRepository.countCoversForShift(lockedShift.getId(), startUtc, endUtc);
        int holdCovers = holdRepository.countActiveHoldCoversForShift(
                lockedShift.getId(), startUtc, endUtc, timeService.now());
        if (currentCovers + holdCovers + partySize > lockedShift.getMaxCovers()) {
            throw new ConflictException("Shift capacity exceeded");
        }
    }

    /**
     * Record holding both the persisted hold and the raw token.
     */
    public record HoldWithToken(Hold hold, String token) {}
}
