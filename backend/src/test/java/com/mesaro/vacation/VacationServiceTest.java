package com.mesaro.vacation;

import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.infra.EmailService;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantAccessGuard;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VacationServiceTest {

    @Mock
    private VacationRepository vacationRepository;
    @Mock
    private RestaurantService restaurantService;
    @Mock
    private UserAccountRepository userAccountRepository;
    @Mock
    private UserRestaurantRepository userRestaurantRepository;
    @Mock
    private StaffShiftAssignmentRepository assignmentRepository;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private AuditService auditService;
    @Mock
    private RestaurantAccessGuard restaurantAccessGuard;

    private VacationService vacationService;

    @BeforeEach
    void setUp() {
        vacationService = new VacationService(
                vacationRepository,
                restaurantService,
                userAccountRepository,
                userRestaurantRepository,
                assignmentRepository,
                reservationRepository,
                emailService,
                auditService,
                restaurantAccessGuard
        );
    }

    @Test
    void createStaffVacation_staffSelf_createsPendingRequest() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        when(restaurantService.findById(1L)).thenReturn(restaurant);
        when(restaurantAccessGuard.hasAtLeastRole(1L, "MANAGER")).thenReturn(false);
        when(userAccountRepository.findById(22L)).thenReturn(Optional.of(new com.mesaro.user.UserAccount("staff@test.com", "hash")));
        when(userRestaurantRepository.existsByUser_IdAndRestaurant_Id(22L, 1L)).thenReturn(true);
        when(vacationRepository.findOverlappingVacationsForUser(
                1L, 22L, LocalDate.of(2025, 4, 1), LocalDate.of(2025, 4, 3))).thenReturn(List.of());
        when(vacationRepository.save(any(Vacation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateStaffVacationRequest request = new CreateStaffVacationRequest(
                22L,
                LocalDate.of(2025, 4, 1),
                LocalDate.of(2025, 4, 3),
                VacationReason.VACATION,
                "Annual leave"
        );

        Vacation result = vacationService.createStaffVacation(1L, request, 22L);

        assertEquals(VacationStatus.PENDING, result.getStatus());
        assertEquals(22L, result.getUserId());
        verify(vacationRepository).save(any(Vacation.class));
    }

    @Test
    void createStaffVacation_staffForOtherUser_throwsAccessDenied() {
        when(restaurantAccessGuard.hasAtLeastRole(1L, "MANAGER")).thenReturn(false);

        CreateStaffVacationRequest request = new CreateStaffVacationRequest(
                99L,
                LocalDate.of(2025, 4, 1),
                LocalDate.of(2025, 4, 3),
                VacationReason.VACATION,
                "Not allowed"
        );

        assertThrows(AccessDeniedException.class, () -> vacationService.createStaffVacation(1L, request, 22L));
        verify(vacationRepository, never()).save(any(Vacation.class));
    }

    @Test
    void createClosure_overlapping_throwsConflict() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        Vacation existing = Vacation.createClosure(
                restaurant,
                ClosureReason.HOLIDAY,
                LocalDate.of(2025, 1, 10),
                LocalDate.of(2025, 1, 12)
        );

        when(restaurantService.findById(1L)).thenReturn(restaurant);
        when(vacationRepository.findOverlappingClosures(1L,
                LocalDate.of(2025, 1, 11),
                LocalDate.of(2025, 1, 13),
                null)).thenReturn(List.of(existing));

        CreateClosureRequest request = new CreateClosureRequest(
                LocalDate.of(2025, 1, 11),
                LocalDate.of(2025, 1, 13),
                ClosureReason.HOLIDAY,
                null
        );

        assertThrows(ConflictException.class, () -> vacationService.createClosure(1L, request, 5L));
        verify(vacationRepository, never()).save(any(Vacation.class));
    }

    @Test
    void approveStaffVacation_pending_setsApproved() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        Vacation vacation = Vacation.createStaffVacation(
                restaurant,
                22L,
                VacationReason.PERSONAL,
                LocalDate.of(2025, 2, 1),
                LocalDate.of(2025, 2, 3)
        );
        ReflectionTestUtils.setField(vacation, "id", 100L);

        when(vacationRepository.findByIdWithRestaurantForUpdate(100L)).thenReturn(Optional.of(vacation));
        when(vacationRepository.approveIfPending(any(Long.class), any(Long.class), any(Instant.class))).thenAnswer(invocation -> {
            vacation.setStatus(VacationStatus.APPROVED);
            vacation.setApprovedBy(invocation.getArgument(1));
            vacation.setApprovedAt(invocation.getArgument(2));
            return 1;
        });
        when(vacationRepository.findById(100L)).thenReturn(Optional.of(vacation));
        when(assignmentRepository.findByRestaurant_IdAndUser_IdAndServiceDateBetween(
                1L, 22L, LocalDate.of(2025, 2, 1), LocalDate.of(2025, 2, 3))).thenReturn(List.of());
        when(assignmentRepository.deleteByRestaurant_IdAndUser_IdAndServiceDateBetween(
                1L, 22L, LocalDate.of(2025, 2, 1), LocalDate.of(2025, 2, 3))).thenReturn(2L);

        Vacation result = vacationService.approveStaffVacation(1L, 100L, 9L);

        assertEquals(VacationStatus.APPROVED, result.getStatus());
        assertEquals(9L, result.getApprovedBy());
        assertNotNull(result.getApprovedAt());
        verify(assignmentRepository).deleteByRestaurant_IdAndUser_IdAndServiceDateBetween(
                1L, 22L, LocalDate.of(2025, 2, 1), LocalDate.of(2025, 2, 3));
    }

    @Test
    void rejectStaffVacation_pending_setsRejectedAndNotes() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        Vacation vacation = Vacation.createStaffVacation(
                restaurant,
                22L,
                VacationReason.PERSONAL,
                LocalDate.of(2025, 3, 1),
                LocalDate.of(2025, 3, 2)
        );
        ReflectionTestUtils.setField(vacation, "id", 200L);

        when(vacationRepository.findByIdWithRestaurantForUpdate(200L)).thenReturn(Optional.of(vacation));
        when(vacationRepository.rejectIfPending(any(Long.class), any(Long.class), any(Instant.class))).thenAnswer(invocation -> {
            vacation.setStatus(VacationStatus.REJECTED);
            vacation.setApprovedBy(invocation.getArgument(1));
            vacation.setApprovedAt(invocation.getArgument(2));
            return 1;
        });
        when(vacationRepository.findById(200L)).thenReturn(Optional.of(vacation));
        when(vacationRepository.save(any(Vacation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Vacation result = vacationService.rejectStaffVacation(1L, 200L, 9L, "Too busy");

        assertEquals(VacationStatus.REJECTED, result.getStatus());
        assertNotNull(result.getNotes());
    }

    @Test
    @DisplayName("createStaffVacation is guarded with staff-level @PreAuthorize")
    void createStaffVacation_hasStaffGuard() throws Exception {
        PreAuthorize createGuard = VacationService.class
                .getMethod("createStaffVacation", Long.class, CreateStaffVacationRequest.class, Long.class)
                .getAnnotation(PreAuthorize.class);

        assertNotNull(createGuard);
        assertEquals("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')", createGuard.value());
    }

    @Test
    @DisplayName("update and cancel are guarded with manager-level @PreAuthorize")
    void updateAndCancel_haveManagerGuards() throws Exception {
        PreAuthorize updateGuard = VacationService.class
                .getMethod("update", Long.class, Long.class, UpdateVacationRequest.class)
                .getAnnotation(PreAuthorize.class);
        PreAuthorize cancelGuard = VacationService.class
                .getMethod("cancel", Long.class, Long.class, Long.class)
                .getAnnotation(PreAuthorize.class);

        assertNotNull(updateGuard);
        assertNotNull(cancelGuard);
        assertEquals("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')", updateGuard.value());
        assertEquals("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')", cancelGuard.value());
    }
}
