package com.mesaro.planning;

import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.security.RestaurantRole;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantId;
import com.mesaro.user.UserRestaurantRepository;
import com.mesaro.vacation.Vacation;
import com.mesaro.vacation.VacationRepository;
import com.mesaro.vacation.VacationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffPlanningServiceTest {

    @Mock
    private StaffShiftAssignmentRepository assignmentRepository;
    @Mock
    private ShiftService shiftService;
    @Mock
    private UserRestaurantRepository userRestaurantRepository;
    @Mock
    private UserAccountRepository userAccountRepository;
    @Mock
    private VacationService vacationService;
    @Mock
    private VacationRepository vacationRepository;
    @Mock
    private StaffWeeklyWorkHoursRepository weeklyWorkHoursRepository;
    @Mock
    private AuditService auditService;

    private StaffPlanningService staffPlanningService;

    @BeforeEach
    void setUp() {
        staffPlanningService = new StaffPlanningService(
                assignmentRepository,
                shiftService,
                userRestaurantRepository,
                userAccountRepository,
                vacationService,
                vacationRepository,
                weeklyWorkHoursRepository,
                auditService
        );
    }

    @Test
    void assign_whenRestaurantClosed_throwsConflict() {
        Restaurant restaurant = restaurant(1L);
        Shift shift = shift(10L, restaurant, DayOfWeek.MONDAY);

        AssignStaffShiftRequest request = new AssignStaffShiftRequest(10L, 20L, LocalDate.of(2026, 3, 2), null, null);
        when(shiftService.findByIdAndRestaurant(10L, 1L)).thenReturn(shift);
        when(vacationService.isRestaurantClosed(1L, request.serviceDate())).thenReturn(true);

        assertThatThrownBy(() -> staffPlanningService.assign(1L, request, 99L))
                .isInstanceOf(ConflictException.class);

        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void assign_whenDateDoesNotMatchShiftWeekday_throwsValidation() {
        Restaurant restaurant = restaurant(1L);
        Shift shift = shift(10L, restaurant, DayOfWeek.TUESDAY);

        AssignStaffShiftRequest request = new AssignStaffShiftRequest(10L, 20L, LocalDate.of(2026, 3, 2), null, null); // Monday
        when(shiftService.findByIdAndRestaurant(10L, 1L)).thenReturn(shift);

        assertThatThrownBy(() -> staffPlanningService.assign(1L, request, 99L))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void getDailyPlan_marksVacationUsersUnavailable() {
        Restaurant restaurant = restaurant(1L);
        Shift shift = shift(10L, restaurant, DayOfWeek.MONDAY);

        UserAccount manager = user(20L, "manager@demo.com", "Manager");
        UserAccount staff = user(21L, "staff@demo.com", "Staff");
        UserRestaurant managerMember = new UserRestaurant(manager, restaurant, RestaurantRole.MANAGER);
        UserRestaurant staffMember = new UserRestaurant(staff, restaurant, RestaurantRole.STAFF);

        LocalDate date = LocalDate.of(2026, 3, 2);
        Vacation staffVacation = Vacation.createStaffVacation(restaurant, 21L,
                com.mesaro.vacation.VacationReason.VACATION, date, date);

        when(shiftService.findByRestaurantAndDay(1L, 1)).thenReturn(List.of(shift));
        when(assignmentRepository.findByRestaurantAndDateWithAssociations(1L, date)).thenReturn(List.of());
        when(userRestaurantRepository.findByRestaurantIdWithUser(1L)).thenReturn(List.of(managerMember, staffMember));
        when(vacationService.getClosuresBetween(1L, date, date)).thenReturn(List.of());
        when(vacationRepository.findStaffVacationsOnDate(1L, date)).thenReturn(List.of(staffVacation));

        StaffPlanningResponse response = staffPlanningService.getDailyPlan(1L, date);

        assertThat(response.restaurantClosed()).isFalse();
        assertThat(response.shifts()).hasSize(1);
        assertThat(response.shifts().get(0).availableStaff()).hasSize(1);
        assertThat(response.shifts().get(0).availableStaff().get(0).userId()).isEqualTo(20L);
        assertThat(response.shifts().get(0).unavailableStaff()).hasSize(1);
        assertThat(response.shifts().get(0).unavailableStaff().get(0).userId()).isEqualTo(21L);
        assertThat(response.shifts().get(0).unavailableStaff().get(0).reason()).isEqualTo("ON_VACATION");
    }

    @Test
    void getWeeklyWorkHours_normalizesToMondayAndReturnsDefaults() {
        Restaurant restaurant = restaurant(1L);
        UserAccount manager = user(20L, "manager@demo.com", "Manager");
        UserRestaurant managerMember = new UserRestaurant(manager, restaurant, RestaurantRole.MANAGER);
        LocalDate requestedSunday = LocalDate.of(2026, 3, 8);

        when(userRestaurantRepository.findByRestaurantIdWithUser(1L)).thenReturn(List.of(managerMember));
        when(weeklyWorkHoursRepository.findByRestaurantAndWeekStartWithUser(1L, LocalDate.of(2026, 3, 2)))
                .thenReturn(List.of());

        List<StaffWeeklyWorkHoursResponse> response = staffPlanningService.getWeeklyWorkHours(1L, requestedSunday);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).plannedHours()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void assignRecurringWeek_assignsAndSkipsUnavailableDays() {
        Restaurant restaurant = restaurant(1L);
        Shift mondayReference = shift(10L, restaurant, DayOfWeek.MONDAY);
        Shift mondayMatch = shift(11L, restaurant, DayOfWeek.MONDAY);
        mondayMatch.setName("Lunch");
        mondayMatch.setStartTime(LocalTime.of(12, 0));
        mondayMatch.setEndTime(LocalTime.of(14, 0));
        Shift tuesdayMatch = shift(12L, restaurant, DayOfWeek.TUESDAY);
        tuesdayMatch.setName("Lunch");
        tuesdayMatch.setStartTime(LocalTime.of(12, 0));
        tuesdayMatch.setEndTime(LocalTime.of(14, 0));

        LocalDate weekMonday = LocalDate.of(2026, 3, 2);
        AssignStaffRecurringWeekRequest request = new AssignStaffRecurringWeekRequest(10L, 20L, weekMonday, null, null);

        UserAccount user = user(20L, "staff@demo.com", "Staff");
        UserRestaurant membership = new UserRestaurant(user, restaurant, RestaurantRole.STAFF);

        when(shiftService.findByIdAndRestaurant(10L, 1L)).thenReturn(mondayReference);
        when(userAccountRepository.findById(20L)).thenReturn(java.util.Optional.of(user));
        when(userRestaurantRepository.findByIdWithUser(new UserRestaurantId(20L, 1L)))
                .thenReturn(java.util.Optional.of(membership));

        when(vacationService.isRestaurantClosed(eq(1L), any(LocalDate.class))).thenReturn(false);
        when(vacationRepository.findOverlappingVacationsForUser(eq(1L), eq(20L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of());

        when(shiftService.findByRestaurantAndDay(1L, DayOfWeek.MONDAY.getValue())).thenReturn(List.of(mondayMatch));
        when(shiftService.findByRestaurantAndDay(1L, DayOfWeek.TUESDAY.getValue())).thenReturn(List.of(tuesdayMatch));
        when(shiftService.findByRestaurantAndDay(1L, DayOfWeek.WEDNESDAY.getValue())).thenReturn(List.of());
        when(shiftService.findByRestaurantAndDay(1L, DayOfWeek.THURSDAY.getValue())).thenReturn(List.of());
        when(shiftService.findByRestaurantAndDay(1L, DayOfWeek.FRIDAY.getValue())).thenReturn(List.of());
        when(shiftService.findByRestaurantAndDay(1L, DayOfWeek.SATURDAY.getValue())).thenReturn(List.of());
        when(shiftService.findByRestaurantAndDay(1L, DayOfWeek.SUNDAY.getValue())).thenReturn(List.of());

        when(assignmentRepository.existsByShift_IdAndUser_IdAndServiceDate(any(), eq(20L), any(LocalDate.class))).thenReturn(false);
        AtomicLong assignmentId = new AtomicLong(100L);
        when(assignmentRepository.save(any(StaffShiftAssignment.class))).thenAnswer(invocation -> {
            StaffShiftAssignment assignment = invocation.getArgument(0);
            ReflectionTestUtils.setField(assignment, "id", assignmentId.getAndIncrement());
            return assignment;
        });

        AssignStaffRecurringWeekResponse response = staffPlanningService.assignRecurringWeek(1L, request, 99L);

        assertThat(response.assignedCount()).isEqualTo(2);
        assertThat(response.assignedDates()).containsExactly(weekMonday, weekMonday.plusDays(1));
        assertThat(response.skipped()).hasSize(5);
        assertThat(response.skipped().stream().map(RecurringAssignmentSkippedResponse::reason))
                .allMatch(reason -> reason.equals("NO_MATCHING_SHIFT"));
    }

    private Restaurant restaurant(Long id) {
        Restaurant restaurant = new Restaurant("Demo", "demo", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", id);
        return restaurant;
    }

    private Shift shift(Long id, Restaurant restaurant, DayOfWeek dayOfWeek) {
        Shift shift = new Shift(restaurant, "Lunch", dayOfWeek, LocalTime.of(12, 0), LocalTime.of(14, 0), 20);
        ReflectionTestUtils.setField(shift, "id", id);
        return shift;
    }

    private UserAccount user(Long id, String email, String fullName) {
        UserAccount user = new UserAccount(email, "hash");
        user.setFullName(fullName);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
