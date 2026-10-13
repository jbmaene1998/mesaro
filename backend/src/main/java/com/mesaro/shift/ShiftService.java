package com.mesaro.shift;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.TimeService;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ShiftService {

    private static final Logger log = LoggerFactory.getLogger(ShiftService.class);

    private final ShiftRepository shiftRepository;
    private final HoldRepository holdRepository;
    private final ReservationRepository reservationRepository;
    private final StaffShiftAssignmentRepository assignmentRepository;
    private final RestaurantService restaurantService;
    private final TimeService timeService;
    private final AuditService auditService;

    public ShiftService(ShiftRepository shiftRepository,
                        HoldRepository holdRepository,
                        ReservationRepository reservationRepository,
                        StaffShiftAssignmentRepository assignmentRepository,
                        RestaurantService restaurantService,
                        TimeService timeService,
                        AuditService auditService) {
        this.shiftRepository = shiftRepository;
        this.holdRepository = holdRepository;
        this.reservationRepository = reservationRepository;
        this.assignmentRepository = assignmentRepository;
        this.restaurantService = restaurantService;
        this.timeService = timeService;
        this.auditService = auditService;
    }

    public Shift findById(Long id) {
        return shiftRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Shift", id));
    }

    public Shift findByIdWithRestaurant(Long id) {
        return shiftRepository.findByIdWithRestaurant(id)
                .orElseThrow(() -> new NotFoundException("Shift", id));
    }

    public Shift findByIdAndRestaurant(Long id, Long restaurantId) {
        Shift shift = findById(id);
        if (!shift.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("Shift", id);
        }
        restaurantService.findOperationalById(restaurantId);
        return shift;
    }

    public List<Shift> findByRestaurant(Long restaurantId) {
        restaurantService.findOperationalById(restaurantId);
        return shiftRepository.findByRestaurantIdWithRestaurant(restaurantId);
    }

    public List<Shift> findByRestaurantAndDay(Long restaurantId, int dayOfWeek) {
        validateDayOfWeek(dayOfWeek);
        restaurantService.findOperationalById(restaurantId);
        return shiftRepository.findByRestaurantIdAndDayOfWeekOrderByStartTime(restaurantId, dayOfWeek);
    }

    public List<Shift> findActiveByRestaurantAndDay(Long restaurantId, int dayOfWeek) {
        validateDayOfWeek(dayOfWeek);
        restaurantService.findOperationalById(restaurantId);
        return shiftRepository.findByRestaurantIdAndDayOfWeekAndStatus(restaurantId, dayOfWeek, ShiftStatus.ACTIVE);
    }

    @Transactional
    public Shift create(Long restaurantId, CreateShiftRequest request) {
        Restaurant restaurant = restaurantService.findOperationalById(restaurantId);

        validateTimeRange(request.startTime(), request.endTime());
        validateLastReservationTime(request.startTime(), request.endTime(), request.lastReservationTime());
        validateNoOverlap(restaurantId, request.dayOfWeek(), request.startTime(), request.endTime(), null);

        Shift shift = new Shift(
                restaurant,
                request.name(),
                DayOfWeek.of(request.dayOfWeek()),
                request.startTime(),
                request.endTime(),
                request.maxCovers()
        );
        shift.setSlotDurationMinutes(request.slotDurationMinutes());
        shift.setLastReservationTime(request.lastReservationTime());

        Shift saved = shiftRepository.save(shift);
        log.info("Created shift '{}' for restaurant {} on day {}",
                saved.getName(), restaurantId, DayOfWeek.of(request.dayOfWeek()));
        auditService.record(
                AuditEventType.SHIFT_CREATED,
                restaurantId,
                null,
                saved.getId(),
                "SHIFT",
                Map.of("name", saved.getName(), "dayOfWeek", saved.getDayOfWeek())
        );
        return saved;
    }

    @Transactional
    public List<Shift> createBulk(Long restaurantId, BulkCreateShiftsRequest request) {
        restaurantService.findOperationalById(restaurantId);
        List<Shift> created = request.shifts().stream()
                .map(shiftRequest -> create(restaurantId, shiftRequest))
                .toList();

        if (Boolean.TRUE.equals(request.activate())) {
            return created.stream()
                    .map(shift -> activate(restaurantId, shift.getId()))
                    .toList();
        }
        return created;
    }

    @Transactional
    public Shift update(Long restaurantId, Long shiftId, UpdateShiftRequest request) {
        Shift shift = findByIdAndRestaurant(shiftId, restaurantId);

        if (!shift.isEditable() && hasStructuralChanges(shift, request)) {
            throw new ConflictException("Cannot modify times or day of an active shift. Deactivate it first.");
        }

        int dayOfWeek = request.dayOfWeek() != null ? request.dayOfWeek() : shift.getDayOfWeek();
        LocalTime startTime = request.startTime() != null ? request.startTime() : shift.getStartTime();
        LocalTime endTime = request.endTime() != null ? request.endTime() : shift.getEndTime();
        LocalTime lastReservationTime = request.lastReservationTime() != null
                ? request.lastReservationTime()
                : shift.getLastReservationTime();

        validateTimeRange(startTime, endTime);
        validateLastReservationTime(startTime, endTime, lastReservationTime);
        validateNoOverlap(restaurantId, dayOfWeek, startTime, endTime, shiftId);

        if (request.name() != null && !request.name().isBlank()) {
            shift.setName(request.name());
        }
        if (request.dayOfWeek() != null) {
            shift.setDayOfWeek(request.dayOfWeek());
        }
        if (request.startTime() != null) {
            shift.setStartTime(request.startTime());
        }
        if (request.endTime() != null) {
            shift.setEndTime(request.endTime());
        }
        if (request.lastReservationTime() != null) {
            shift.setLastReservationTime(request.lastReservationTime());
        }
        if (request.maxCovers() != null) {
            if (request.maxCovers() < shift.getMaxCovers()) {
                ZoneId timezone = ZoneId.of(shift.getRestaurant().getTimezone());
                int daysToCheck = 14;
                int overCapacityDayCount = 0;
                for (int i = 0; i < daysToCheck; i++) {
                    LocalDate date = timeService.today(timezone).plusDays(i);
                    if (date.getDayOfWeek().getValue() != shift.getDayOfWeek()) {
                        continue;
                    }
                    Instant dayStart = date.atStartOfDay(timezone).toInstant();
                    Instant dayEnd = date.plusDays(1).atStartOfDay(timezone).toInstant();
                    int covers = reservationRepository.countCoversForShift(shift.getId(), dayStart, dayEnd);
                    if (covers > request.maxCovers()) {
                        overCapacityDayCount++;
                        log.warn("Shift {} on {} already has {} covers, exceeding new max {}",
                                shift.getName(), date, covers, request.maxCovers());
                    }
                }
                shift.setOverCapacityDayCount(overCapacityDayCount);
            } else {
                shift.setOverCapacityDayCount(0);
            }
            shift.setMaxCovers(request.maxCovers());
        }
        if (request.slotDurationMinutes() != null) {
            shift.setSlotDurationMinutes(request.slotDurationMinutes());
        }
        if (request.status() != null) {
            validateStatusTransition(shift, request.status());
            if (request.status() == ShiftStatus.INACTIVE && shift.getStatus() != ShiftStatus.INACTIVE) {
                long upcomingReservations = reservationRepository.countUpcomingActiveByShift(shiftId, timeService.now());
                if (upcomingReservations > 0) {
                    throw new ConflictException(
                            "Cannot deactivate shift: " + upcomingReservations + " upcoming active reservation(s) exist. " +
                                    "Cancel or reassign them before deactivating this shift."
                    );
                }
                int expiredCount = holdRepository.deleteActiveHoldsByShiftId(shiftId, timeService.now());
                if (expiredCount > 0) {
                    log.info("Expired {} active hold(s) due to shift {} deactivation", expiredCount, shiftId);
                }
            }
            shift.setStatus(request.status());
        }

        Shift saved = shiftRepository.save(shift);
        log.info("Updated shift '{}' for restaurant {}", saved.getName(), restaurantId);
        auditService.record(
                AuditEventType.SHIFT_UPDATED,
                restaurantId,
                null,
                saved.getId(),
                "SHIFT",
                Map.of("name", saved.getName(), "status", saved.getStatus().name())
        );
        return saved;
    }

    @Transactional
    public Shift activate(Long restaurantId, Long shiftId) {
        Shift shift = findByIdAndRestaurant(shiftId, restaurantId);
        if (shift.getStatus() == ShiftStatus.ACTIVE) {
            return shift;
        }
        validateStatusTransition(shift, ShiftStatus.ACTIVE);
        ZoneId timezone = ZoneId.of(shift.getRestaurant().getTimezone());
        int daysToCheck = 14;
        int overCapacityDayCount = 0;
        for (int i = 0; i < daysToCheck; i++) {
            LocalDate date = timeService.today(timezone).plusDays(i);
            if (date.getDayOfWeek().getValue() != shift.getDayOfWeek()) {
                continue;
            }
            Instant dayStart = date.atStartOfDay(timezone).toInstant();
            Instant dayEnd = date.plusDays(1).atStartOfDay(timezone).toInstant();
            int covers = reservationRepository.countCoversForShift(shift.getId(), dayStart, dayEnd);
            if (covers > shift.getMaxCovers()) {
                overCapacityDayCount++;
                log.warn("Activating shift '{}': date {} already has {} covers, exceeding max_covers={}",
                        shift.getName(), date, covers, shift.getMaxCovers());
            }
        }
        shift.setOverCapacityDayCount(overCapacityDayCount);
        shift.setStatus(ShiftStatus.ACTIVE);
        Shift saved = shiftRepository.save(shift);
        log.info("Activated shift '{}' for restaurant {}", saved.getName(), restaurantId);
        auditService.record(
                AuditEventType.SHIFT_ACTIVATED,
                restaurantId,
                null,
                saved.getId(),
                "SHIFT",
                Map.of("name", saved.getName())
        );
        return saved;
    }

    @Transactional
    public List<Shift> publishDrafts(Long restaurantId) {
        restaurantService.findOperationalById(restaurantId);
        List<Shift> drafts = shiftRepository.findByRestaurantIdWithRestaurant(restaurantId).stream()
                .filter(shift -> shift.getStatus() == ShiftStatus.DRAFT)
                .toList();
        if (drafts.isEmpty()) {
            throw new ValidationException("No draft shifts to publish");
        }
        return drafts.stream()
                .map(shift -> activate(restaurantId, shift.getId()))
                .toList();
    }

    @Transactional
    public Shift deactivate(Long restaurantId, Long shiftId) {
        Shift shift = findByIdAndRestaurant(shiftId, restaurantId);
        if (shift.getStatus() == ShiftStatus.INACTIVE) {
            return shift;
        }
        validateStatusTransition(shift, ShiftStatus.INACTIVE);
        long upcomingReservations = reservationRepository.countUpcomingActiveByShift(shiftId, timeService.now());
        if (upcomingReservations > 0) {
            throw new ConflictException(
                    "Cannot deactivate shift: " + upcomingReservations + " upcoming active reservation(s) exist. " +
                            "Cancel or reassign them before deactivating this shift."
            );
        }
        int expiredCount = holdRepository.deleteActiveHoldsByShiftId(shiftId, timeService.now());
        if (expiredCount > 0) {
            log.info("Expired {} active hold(s) due to shift {} deactivation", expiredCount, shiftId);
        }
        shift.setStatus(ShiftStatus.INACTIVE);
        Shift saved = shiftRepository.save(shift);
        log.info("Deactivated shift '{}' for restaurant {}", saved.getName(), restaurantId);
        auditService.record(
                AuditEventType.SHIFT_DEACTIVATED,
                restaurantId,
                null,
                saved.getId(),
                "SHIFT",
                Map.of("name", saved.getName())
        );
        return saved;
    }

    @Transactional
    public void delete(Long restaurantId, Long shiftId) {
        Shift shift = shiftRepository.findByIdForUpdate(shiftId)
                .orElseThrow(() -> new NotFoundException("Shift", shiftId));
        if (!shift.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("Shift", shiftId);
        }
        restaurantService.findOperationalById(restaurantId);

        if (shift.getStatus() == ShiftStatus.ACTIVE) {
            throw new ConflictException("Cannot delete an active shift. Deactivate it first.");
        }
        if (reservationRepository.existsByShift_Id(shiftId)) {
            throw new ConflictException("Cannot delete shift: it is linked to reservation history");
        }
        if (holdRepository.existsByShift_Id(shiftId)) {
            throw new ConflictException("Cannot delete shift: it is linked to hold history");
        }
        if (assignmentRepository.existsByShift_Id(shiftId)) {
            throw new ConflictException("Cannot delete shift: it has existing staff assignments");
        }

        String name = shift.getName();
        shiftRepository.delete(shift);
        log.info("Deleted shift '{}' from restaurant {}", name, restaurantId);
        auditService.record(
                AuditEventType.SHIFT_DELETED,
                restaurantId,
                null,
                shiftId,
                "SHIFT",
                Map.of("name", name)
        );
    }

    private void validateDayOfWeek(int dayOfWeek) {
        if (dayOfWeek < 1 || dayOfWeek > 7) {
            throw new ValidationException("Day of week must be between 1 (Monday) and 7 (Sunday)", "dayOfWeek");
        }
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (startTime.equals(endTime)) {
            throw new ValidationException("Start time and end time cannot be the same", "startTime");
        }
    }

    private void validateNoOverlap(Long restaurantId, int dayOfWeek, LocalTime startTime, LocalTime endTime, Long excludeId) {
        // Only ACTIVE shifts block the calendar; DRAFT/INACTIVE can share windows for replacements.
        List<Shift> existing = shiftRepository.findByRestaurantIdWithRestaurant(restaurantId).stream()
                .filter(item -> excludeId == null || !item.getId().equals(excludeId))
                .filter(item -> item.getStatus() == ShiftStatus.ACTIVE)
                .toList();

        ShiftWindow candidate = buildWindow(dayOfWeek, startTime, endTime);
        List<Shift> overlapping = existing.stream()
                .filter(item -> windowsOverlap(candidate, buildWindow(item.getDayOfWeek(), item.getStartTime(), item.getEndTime())))
                .toList();

        if (!overlapping.isEmpty()) {
            String conflictNames = overlapping.stream().map(Shift::getName).reduce((a, b) -> a + ", " + b).orElse("");
            throw new ConflictException("Shift overlaps with existing shift(s): " + conflictNames);
        }
    }

    private void validateLastReservationTime(LocalTime startTime, LocalTime endTime, LocalTime lastReservationTime) {
        int start = toWeeklyMinute(1, startTime);
        int end = toWeeklyMinute(1, endTime);
        if (!endTime.isAfter(startTime)) {
            end += 24 * 60;
        }

        int last = toWeeklyMinute(1, lastReservationTime);
        if (!endTime.isAfter(startTime) && lastReservationTime.isBefore(startTime)) {
            last += 24 * 60;
        }

        if (last < start || last > end) {
            throw new ValidationException("Last reservation time must be within the shift window", "lastReservationTime");
        }
    }

    private void validateStatusTransition(Shift shift, ShiftStatus newStatus) {
        ShiftStatus currentStatus = shift.getStatus();
        if (currentStatus == newStatus) {
            return;
        }

        boolean validTransition = switch (currentStatus) {
            case DRAFT -> newStatus == ShiftStatus.ACTIVE || newStatus == ShiftStatus.INACTIVE;
            case ACTIVE -> newStatus == ShiftStatus.INACTIVE;
            case INACTIVE -> newStatus == ShiftStatus.ACTIVE;
        };

        if (!validTransition) {
            throw new ValidationException(
                    "Invalid status transition from " + currentStatus + " to " + newStatus, "status");
        }
    }

    private boolean hasStructuralChanges(Shift shift, UpdateShiftRequest request) {
        if (request.dayOfWeek() != null && !request.dayOfWeek().equals(shift.getDayOfWeek())) {
            return true;
        }
        if (request.startTime() != null && !request.startTime().equals(shift.getStartTime())) {
            return true;
        }
        if (request.endTime() != null && !request.endTime().equals(shift.getEndTime())) {
            return true;
        }
        if (request.lastReservationTime() != null && !request.lastReservationTime().equals(shift.getLastReservationTime())) {
            return true;
        }
        return false;
    }

    private boolean windowsOverlap(ShiftWindow a, ShiftWindow b) {
        return rangesOverlap(a.startMinute(), a.endMinute(), b.startMinute(), b.endMinute()) ||
                rangesOverlap(a.startMinute(), a.endMinute(), b.startMinute() + (7 * 24 * 60), b.endMinute() + (7 * 24 * 60)) ||
                rangesOverlap(a.startMinute() + (7 * 24 * 60), a.endMinute() + (7 * 24 * 60), b.startMinute(), b.endMinute());
    }

    private boolean rangesOverlap(int aStart, int aEnd, int bStart, int bEnd) {
        return aStart < bEnd && bStart < aEnd;
    }

    private ShiftWindow buildWindow(int dayOfWeek, LocalTime startTime, LocalTime endTime) {
        int start = toWeeklyMinute(dayOfWeek, startTime);
        int end = toWeeklyMinute(dayOfWeek, endTime);
        if (!endTime.isAfter(startTime)) {
            end += 24 * 60;
        }
        return new ShiftWindow(start, end);
    }

    private int toWeeklyMinute(int dayOfWeek, LocalTime time) {
        int dayOffset = (dayOfWeek - 1) * 24 * 60;
        return dayOffset + (time.getHour() * 60) + time.getMinute();
    }

    private record ShiftWindow(int startMinute, int endMinute) {
    }
}
