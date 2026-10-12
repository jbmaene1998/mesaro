package com.mesaro.planning;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.outbox.OutboxService;
import com.mesaro.security.RestaurantRole;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftService;
import com.mesaro.user.UserRestaurantId;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import com.mesaro.vacation.Vacation;
import com.mesaro.vacation.VacationRepository;
import com.mesaro.vacation.VacationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class StaffPlanningService {

    private static final Logger log = LoggerFactory.getLogger(StaffPlanningService.class);

    private final StaffShiftAssignmentRepository assignmentRepository;
    private final ShiftService shiftService;
    private final UserRestaurantRepository userRestaurantRepository;
    private final UserAccountRepository userAccountRepository;
    private final VacationService vacationService;
    private final VacationRepository vacationRepository;
    private final StaffWeeklyWorkHoursRepository weeklyWorkHoursRepository;
    private final AuditService auditService;
    @Autowired(required = false)
    private OutboxService outboxService;

    public StaffPlanningService(StaffShiftAssignmentRepository assignmentRepository,
                                ShiftService shiftService,
                                UserRestaurantRepository userRestaurantRepository,
                                UserAccountRepository userAccountRepository,
                                VacationService vacationService,
                                VacationRepository vacationRepository,
                                StaffWeeklyWorkHoursRepository weeklyWorkHoursRepository,
                                AuditService auditService) {
        this.assignmentRepository = assignmentRepository;
        this.shiftService = shiftService;
        this.userRestaurantRepository = userRestaurantRepository;
        this.userAccountRepository = userAccountRepository;
        this.vacationService = vacationService;
        this.vacationRepository = vacationRepository;
        this.weeklyWorkHoursRepository = weeklyWorkHoursRepository;
        this.auditService = auditService;
    }

    public StaffPlanningResponse getDailyPlan(Long restaurantId, LocalDate serviceDate) {
        validateDate(serviceDate);

        List<Shift> shifts = shiftService.findByRestaurantAndDay(restaurantId, serviceDate.getDayOfWeek().getValue());
        List<StaffShiftAssignment> assignments = assignmentRepository.findByRestaurantAndDateWithAssociations(restaurantId, serviceDate);
        List<UserRestaurant> members = userRestaurantRepository.findByRestaurantIdWithUser(restaurantId).stream()
                .filter(member -> member.getRole() == RestaurantRole.MANAGER || member.getRole() == RestaurantRole.STAFF)
                .sorted(Comparator.comparing(member -> member.getUser().getEmail()))
                .toList();

        Map<Long, RestaurantRole> roleByUserId = new HashMap<>();
        for (UserRestaurant member : members) {
            roleByUserId.put(member.getUser().getId(), member.getRole());
        }

        List<Vacation> closures = vacationService.getClosuresBetween(restaurantId, serviceDate, serviceDate);
        boolean closed = !closures.isEmpty();
        String closureReason = closed ? closures.get(0).getReason() : null;

        Set<Long> unavailableUserIds = new HashSet<>();
        for (Vacation vacation : vacationRepository.findStaffVacationsOnDate(restaurantId, serviceDate)) {
            if (vacation.getUserId() != null) {
                unavailableUserIds.add(vacation.getUserId());
            }
        }

        Map<Long, List<StaffShiftAssignment>> assignmentsByShiftId = new HashMap<>();
        for (StaffShiftAssignment assignment : assignments) {
            assignmentsByShiftId
                    .computeIfAbsent(assignment.getShift().getId(), ignored -> new ArrayList<>())
                    .add(assignment);
        }

        List<StaffPlanningShiftResponse> shiftResponses = new ArrayList<>();
        for (Shift shift : shifts) {
            List<StaffShiftAssignmentResponse> assigned = assignmentsByShiftId
                    .getOrDefault(shift.getId(), List.of())
                    .stream()
                    .sorted(Comparator.comparing(a -> a.getUser().getEmail()))
                    .map(assignment -> StaffShiftAssignmentResponse.fromEntity(
                            assignment,
                            roleByUserId.getOrDefault(assignment.getUser().getId(), RestaurantRole.STAFF)))
                    .toList();

            Set<Long> assignedUserIds = new HashSet<>();
            for (StaffShiftAssignmentResponse item : assigned) {
                assignedUserIds.add(item.userId());
            }

            List<StaffPlanningStaffResponse> availableStaff = new ArrayList<>();
            List<StaffPlanningUnavailableStaffResponse> unavailableStaff = new ArrayList<>();
            for (UserRestaurant member : members) {
                Long userId = member.getUser().getId();
                if (assignedUserIds.contains(userId)) {
                    continue;
                }
                if (closed) {
                    unavailableStaff.add(StaffPlanningUnavailableStaffResponse.fromMembership(member, "RESTAURANT_CLOSED"));
                    continue;
                }
                if (unavailableUserIds.contains(userId)) {
                    unavailableStaff.add(StaffPlanningUnavailableStaffResponse.fromMembership(member, "ON_VACATION"));
                    continue;
                }
                availableStaff.add(StaffPlanningStaffResponse.fromMembership(member));
            }

            shiftResponses.add(new StaffPlanningShiftResponse(
                    shift.getId(),
                    shift.getName(),
                    shift.getStartTime().toString(),
                    shift.getEndTime().toString(),
                    shift.getStatus(),
                    assigned,
                    availableStaff,
                    unavailableStaff
            ));
        }

        return new StaffPlanningResponse(restaurantId, serviceDate, closed, closureReason, shiftResponses);
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public StaffShiftAssignmentResponse assign(Long restaurantId, AssignStaffShiftRequest request, Long actorUserId) {
        validateDate(request.serviceDate());

        Shift shift = shiftService.findByIdAndRestaurant(request.shiftId(), restaurantId);
        validateShiftDate(shift, request.serviceDate());
        validateRestaurantOpen(restaurantId, request.serviceDate());

        UserAccount user = userAccountRepository.findById(request.userId())
                .orElseThrow(() -> new NotFoundException("User", request.userId()));

        UserRestaurant membership = userRestaurantRepository.findByIdWithUser(
                        new UserRestaurantId(request.userId(), restaurantId))
                .orElseThrow(() -> new ValidationException("User is not a member of this restaurant", "userId"));

        if (membership.getRole() != RestaurantRole.MANAGER && membership.getRole() != RestaurantRole.STAFF) {
            throw new ValidationException("Only manager or staff can be planned on shifts", "userId");
        }

        if (!vacationRepository.findOverlappingVacationsForUser(
                restaurantId,
                request.userId(),
                request.serviceDate(),
                request.serviceDate()
        ).isEmpty()) {
            throw new ConflictException("User is unavailable due to vacation on this date");
        }

        if (assignmentRepository.existsByShift_IdAndUser_IdAndServiceDate(
                request.shiftId(), request.userId(), request.serviceDate())) {
            throw new ConflictException("User is already assigned to this shift on this date");
        }

        LocalTime assignmentStartTime = resolveAssignmentStartTime(shift, request.startTime());
        LocalTime assignmentEndTime = resolveAssignmentEndTime(shift, request.endTime());
        validateAssignmentTimeWindow(assignmentStartTime, assignmentEndTime);
        validateNoCrossRestaurantOverlap(user.getId(), restaurantId, request.serviceDate(), assignmentStartTime, assignmentEndTime, shift.getRestaurant().getTimezone());

        StaffShiftAssignment saved = saveAssignmentWithAudit(
                restaurantId,
                actorUserId,
                shift,
                user,
                request.serviceDate(),
                assignmentStartTime,
                assignmentEndTime);
        return StaffShiftAssignmentResponse.fromEntity(saved, membership.getRole());
    }

    @Transactional
    public AssignStaffRecurringWeekResponse assignRecurringWeek(Long restaurantId,
                                                                AssignStaffRecurringWeekRequest request,
                                                                Long actorUserId) {
        validateDate(request.serviceDate());

        Shift referenceShift = shiftService.findByIdAndRestaurant(request.shiftId(), restaurantId);
        validateShiftDate(referenceShift, request.serviceDate());

        UserAccount user = userAccountRepository.findById(request.userId())
                .orElseThrow(() -> new NotFoundException("User", request.userId()));

        UserRestaurant membership = userRestaurantRepository.findByIdWithUser(
                        new UserRestaurantId(request.userId(), restaurantId))
                .orElseThrow(() -> new ValidationException("User is not a member of this restaurant", "userId"));

        if (membership.getRole() != RestaurantRole.MANAGER && membership.getRole() != RestaurantRole.STAFF) {
            throw new ValidationException("Only manager or staff can be planned on shifts", "userId");
        }

        LocalDate weekStart = request.serviceDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<LocalDate> assignedDates = new ArrayList<>();
        List<RecurringAssignmentSkippedResponse> skipped = new ArrayList<>();

        for (int offset = 0; offset < 7; offset++) {
            LocalDate date = weekStart.plusDays(offset);

            if (vacationService.isRestaurantClosed(restaurantId, date)) {
                skipped.add(new RecurringAssignmentSkippedResponse(date, "RESTAURANT_CLOSED"));
                continue;
            }

            if (!vacationRepository.findOverlappingVacationsForUser(
                    restaurantId,
                    request.userId(),
                    date,
                    date
            ).isEmpty()) {
                skipped.add(new RecurringAssignmentSkippedResponse(date, "ON_VACATION"));
                continue;
            }

            Shift matchingShift = shiftService.findByRestaurantAndDay(restaurantId, date.getDayOfWeek().getValue()).stream()
                    .filter(shift -> matchesRecurringTemplate(referenceShift, shift))
                    .findFirst()
                    .orElse(null);

            if (matchingShift == null) {
                skipped.add(new RecurringAssignmentSkippedResponse(date, "NO_MATCHING_SHIFT"));
                continue;
            }

            if (assignmentRepository.existsByShift_IdAndUser_IdAndServiceDate(
                    matchingShift.getId(), request.userId(), date)) {
                skipped.add(new RecurringAssignmentSkippedResponse(date, "ALREADY_ASSIGNED"));
                continue;
            }

            LocalTime assignmentStartTime = resolveAssignmentStartTime(matchingShift, request.startTime());
            LocalTime assignmentEndTime = resolveAssignmentEndTime(matchingShift, request.endTime());
            validateAssignmentTimeWindow(assignmentStartTime, assignmentEndTime);
            validateNoCrossRestaurantOverlap(user.getId(), restaurantId, date, assignmentStartTime, assignmentEndTime, matchingShift.getRestaurant().getTimezone());

            saveAssignmentWithAudit(
                    restaurantId,
                    actorUserId,
                    matchingShift,
                    user,
                    date,
                    assignmentStartTime,
                    assignmentEndTime);
            assignedDates.add(date);
        }

        return new AssignStaffRecurringWeekResponse(
                request.userId(),
                request.shiftId(),
                weekStart,
                assignedDates.size(),
                assignedDates,
                skipped
        );
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public void remove(Long restaurantId, Long assignmentId, Long actorUserId) {
        StaffShiftAssignment assignment = assignmentRepository.findByIdWithAssociations(assignmentId)
                .orElseThrow(() -> new NotFoundException("StaffShiftAssignment", assignmentId));
        if (!assignment.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("StaffShiftAssignment", assignmentId);
        }

        assignmentRepository.delete(assignment);

        auditService.record(
                AuditEventType.STAFF_SHIFT_UNPLANNED,
                restaurantId,
                actorUserId,
                assignmentId,
                "STAFF_SHIFT_ASSIGNMENT",
                Map.of(
                        "shiftId", assignment.getShift().getId(),
                        "userId", assignment.getUser().getId(),
                        "serviceDate", assignment.getServiceDate().toString()
                )
        );
        if (outboxService != null) {
            outboxService.enqueue(
                    "STAFF_SHIFT_ASSIGNMENT",
                    assignmentId,
                    "StaffAssignmentDeleted",
                    Map.of(
                            "assignmentId", assignmentId,
                            "restaurantId", restaurantId,
                            "userId", assignment.getUser().getId(),
                            "shiftId", assignment.getShift().getId()
                    ),
                    assignmentId + ":deleted"
            );
        }

        log.info("Removed planned user {} from shift {} for restaurant {} at {}",
                assignment.getUser().getId(), assignment.getShift().getId(), restaurantId, assignment.getServiceDate());
    }

    public StaffShiftAssignment findByIdWithAssociations(Long assignmentId) {
        return assignmentRepository.findByIdWithAssociations(assignmentId)
                .orElseThrow(() -> new NotFoundException("StaffShiftAssignment", assignmentId));
    }

    public List<StaffWeeklyWorkHoursResponse> getWeeklyWorkHours(Long restaurantId, LocalDate weekStartDate) {
        LocalDate normalizedWeekStart = normalizeWeekStart(weekStartDate);

        List<UserRestaurant> members = userRestaurantRepository.findByRestaurantIdWithUser(restaurantId).stream()
                .filter(member -> member.getRole() == RestaurantRole.MANAGER || member.getRole() == RestaurantRole.STAFF)
                .sorted(Comparator.comparing(member -> member.getUser().getEmail()))
                .toList();

        Map<Long, BigDecimal> hoursByUserId = new HashMap<>();
        for (StaffWeeklyWorkHours weeklyHours : weeklyWorkHoursRepository.findByRestaurantAndWeekStartWithUser(
                restaurantId, normalizedWeekStart)) {
            hoursByUserId.put(weeklyHours.getUser().getId(), weeklyHours.getPlannedHours());
        }

        List<StaffWeeklyWorkHoursResponse> response = new ArrayList<>();
        for (UserRestaurant member : members) {
            response.add(StaffWeeklyWorkHoursResponse.fromMembership(
                    member,
                    hoursByUserId.getOrDefault(member.getUser().getId(), BigDecimal.ZERO)
            ));
        }
        return response;
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public StaffWeeklyWorkHoursResponse upsertWeeklyWorkHours(Long restaurantId,
                                                              UpsertWeeklyWorkHoursRequest request,
                                                              Long actorUserId) {
        if (request.plannedHours() == null || request.plannedHours().compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Planned hours must be zero or higher", "plannedHours");
        }

        LocalDate normalizedWeekStart = normalizeWeekStart(request.weekStartDate());

        UserRestaurant membership = userRestaurantRepository.findByIdWithUser(new UserRestaurantId(request.userId(), restaurantId))
                .orElseThrow(() -> new ValidationException("User is not a member of this restaurant", "userId"));

        if (membership.getRole() != RestaurantRole.MANAGER && membership.getRole() != RestaurantRole.STAFF) {
            throw new ValidationException("Only manager or staff can receive weekly work hours", "userId");
        }

        StaffWeeklyWorkHours weeklyHours = weeklyWorkHoursRepository
                .findByRestaurantUserAndWeekStartWithAssociations(restaurantId, request.userId(), normalizedWeekStart)
                .orElseGet(() -> new StaffWeeklyWorkHours(
                        membership.getRestaurant(),
                        membership.getUser(),
                        normalizedWeekStart,
                        request.plannedHours()
                ));

        weeklyHours.setPlannedHours(request.plannedHours());
        StaffWeeklyWorkHours saved = weeklyWorkHoursRepository.save(weeklyHours);

        auditService.record(
                AuditEventType.STAFF_WEEKLY_HOURS_SET,
                restaurantId,
                actorUserId,
                saved.getId(),
                "STAFF_WEEKLY_WORK_HOURS",
                Map.of(
                        "userId", request.userId(),
                        "weekStartDate", normalizedWeekStart.toString(),
                        "plannedHours", request.plannedHours().toPlainString()
                )
        );

        return StaffWeeklyWorkHoursResponse.fromMembership(membership, saved.getPlannedHours());
    }

    private void validateDate(LocalDate serviceDate) {
        if (serviceDate == null) {
            throw new ValidationException("Service date is required", "serviceDate");
        }
    }

    private LocalDate normalizeWeekStart(LocalDate weekStartDate) {
        if (weekStartDate == null) {
            throw new ValidationException("Week start date is required", "weekStartDate");
        }
        return weekStartDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private void validateShiftDate(Shift shift, LocalDate serviceDate) {
        if (shift.getDayOfWeek() != serviceDate.getDayOfWeek().getValue()) {
            throw new ValidationException("Service date does not match shift weekday", "serviceDate");
        }
    }

    private void validateRestaurantOpen(Long restaurantId, LocalDate serviceDate) {
        if (vacationService.isRestaurantClosed(restaurantId, serviceDate)) {
            throw new ConflictException("Restaurant is closed on this date");
        }
    }

    private boolean matchesRecurringTemplate(Shift reference, Shift candidate) {
        return reference.getName().equalsIgnoreCase(candidate.getName())
                && reference.getStartTime().equals(candidate.getStartTime())
                && reference.getEndTime().equals(candidate.getEndTime());
    }

    private LocalTime resolveAssignmentStartTime(Shift shift, LocalTime requestedStartTime) {
        return requestedStartTime != null ? requestedStartTime : shift.getStartTime();
    }

    private LocalTime resolveAssignmentEndTime(Shift shift, LocalTime requestedEndTime) {
        return requestedEndTime != null ? requestedEndTime : shift.getEndTime();
    }

    private void validateAssignmentTimeWindow(LocalTime startTime, LocalTime endTime) {
        if (startTime == null) {
            throw new ValidationException("Start time is required", "startTime");
        }
        if (endTime == null) {
            throw new ValidationException("End time is required", "endTime");
        }
        if (startTime.equals(endTime)) {
            throw new ValidationException("Start and end time cannot be equal", "endTime");
        }
    }

    private StaffShiftAssignment saveAssignmentWithAudit(Long restaurantId,
                                                         Long actorUserId,
                                                         Shift shift,
                                                         UserAccount user,
                                                         LocalDate serviceDate,
                                                         LocalTime startTime,
                                                         LocalTime endTime) {
        StaffShiftAssignment saved = assignmentRepository.save(
                new StaffShiftAssignment(
                        shift.getRestaurant(),
                        shift,
                        user,
                        serviceDate,
                        startTime,
                        endTime));

        auditService.record(
                AuditEventType.STAFF_SHIFT_PLANNED,
                restaurantId,
                actorUserId,
                saved.getId(),
                "STAFF_SHIFT_ASSIGNMENT",
                Map.of(
                        "shiftId", shift.getId(),
                        "userId", user.getId(),
                        "serviceDate", serviceDate.toString(),
                        "startTime", startTime.toString(),
                        "endTime", endTime.toString()
                )
        );

        log.info("Planned user {} on shift {} for restaurant {} at {}",
                user.getId(), shift.getId(), restaurantId, serviceDate);
        return saved;
    }

    private void validateNoCrossRestaurantOverlap(Long userId,
                                                  Long restaurantId,
                                                  LocalDate serviceDate,
                                                  LocalTime startTime,
                                                  LocalTime endTime,
                                                  String timezoneId) {
        ZoneId timezone = ZoneId.of(timezoneId);
        Instant startUtc = serviceDate.atTime(startTime).atZone(timezone).toInstant();
        Instant endUtc = serviceDate.atTime(endTime).atZone(timezone).toInstant();
        if (!endUtc.isAfter(startUtc)) {
            endUtc = endUtc.plusSeconds(24 * 60 * 60L);
        }
        if (!assignmentRepository.findCrossRestaurantOverlapsForUpdate(userId, restaurantId, startUtc, endUtc).isEmpty()) {
            throw new ConflictException("Employee already assigned to an overlapping shift at another location");
        }
    }
}
