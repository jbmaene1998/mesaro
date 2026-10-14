package com.mesaro.reservation;

import com.mesaro.audit.AuditService;
import com.mesaro.billing.BillingService;
import com.mesaro.availability.TableSelectionService;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantAccessGuard;
import com.mesaro.shift.ShiftCapacityService;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.table.DiningTableLockRepository;
import com.mesaro.table.DiningTableService;
import com.mesaro.table.TableCombinationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.access.prepost.PreAuthorize;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationAdminServiceTest {

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private ReservationService reservationService;
    @Mock
    private RestaurantService restaurantService;
    @Mock
    private DiningTableService tableService;
    @Mock
    private DiningTableLockRepository tableLockRepository;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private TableSelectionService tableSelectionService;
    @Mock
    private HoldRepository holdRepository;
    @Mock
    private TableCombinationRepository combinationRepository;
    @Mock
    private RestaurantAccessGuard restaurantAccessGuard;
    @Mock
    private AuditService auditService;
    @Mock
    private TimeService timeService;
    @Mock
    private EmailService emailService;
    @Mock
    private ShiftCapacityService shiftCapacityService;
    @Mock
    private BillingService billingService;

    private ReservationAdminService service;

    @BeforeEach
    void setUp() {
        service = new ReservationAdminService(
                reservationRepository,
                reservationService,
                restaurantService,
                tableService,
                tableLockRepository,
                shiftRepository,
                tableSelectionService,
                holdRepository,
                combinationRepository,
                restaurantAccessGuard,
                auditService,
                timeService,
                emailService,
                shiftCapacityService,
                billingService
        );
    }

    @Test
    void createWalkIn_allowsTimeWithinPastGraceWindow() {
        Restaurant restaurant = new Restaurant("Demo", "demo", "UTC");
        when(restaurantService.findOperationalById(1L)).thenReturn(restaurant);
        doNothing().when(restaurantService).assertCanAcceptBookings(restaurant);
        when(timeService.now()).thenReturn(Instant.parse("2026-01-01T12:00:30Z"));
        when(timeService.toUtcStrict(LocalDate.of(2026, 1, 1), LocalTime.of(12, 0), java.time.ZoneId.of("UTC"), null))
                .thenReturn(Instant.parse("2026-01-01T12:00:00Z"));
        when(shiftRepository.findActiveShiftAtTimeIncludingOvernight(1L, 4, 3, LocalTime.of(12, 0)))
                .thenReturn(java.util.List.of());

        AdminReservationCreateRequest request = new AdminReservationCreateRequest(
                LocalDate.of(2026, 1, 1),
                LocalTime.of(12, 0),
                2,
                "Walk-in Guest",
                null,
                null,
                null,
                90,
                java.util.List.of(10L),
                null,
                null
        );

        assertThatThrownBy(() -> service.createWalkIn(1L, request, 99L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("No active shift at this time");
    }

    @Test
    void createWalkIn_rejectsClearlyPastTime() {
        Restaurant restaurant = new Restaurant("Demo", "demo", "UTC");
        when(restaurantService.findOperationalById(1L)).thenReturn(restaurant);
        doNothing().when(restaurantService).assertCanAcceptBookings(restaurant);
        when(timeService.now()).thenReturn(Instant.parse("2026-01-01T12:01:01Z"));
        when(timeService.toUtcStrict(LocalDate.of(2026, 1, 1), LocalTime.of(12, 0), java.time.ZoneId.of("UTC"), null))
                .thenReturn(Instant.parse("2026-01-01T12:00:00Z"));

        AdminReservationCreateRequest request = new AdminReservationCreateRequest(
                LocalDate.of(2026, 1, 1),
                LocalTime.of(12, 0),
                2,
                "Walk-in Guest",
                null,
                null,
                null,
                90,
                java.util.List.of(10L),
                null,
                null
        );

        assertThatThrownBy(() -> service.createWalkIn(1L, request, 99L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Cannot create reservation for past time");

        verify(billingService).checkBillingAccess(restaurant);

        verify(shiftRepository, never()).findActiveShiftAtTimeIncludingOvernight(anyLong(), anyInt(), anyInt(), any(LocalTime.class));
    }

    @Test
    @DisplayName("cancel and switchTables are guarded with staff-level @PreAuthorize")
    void cancelAndSwitchTables_haveStaffGuards() throws Exception {
        PreAuthorize cancelGuard = ReservationAdminService.class
                .getMethod("cancel", Long.class, Long.class, Long.class, long.class)
                .getAnnotation(PreAuthorize.class);
        PreAuthorize switchTablesGuard = ReservationAdminService.class
                .getMethod("switchTables", Long.class, Long.class, SwitchTablesRequest.class, Long.class, long.class)
                .getAnnotation(PreAuthorize.class);

        assertNotNull(cancelGuard);
        assertNotNull(switchTablesGuard);
        assertEquals("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')", cancelGuard.value());
        assertEquals("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')", switchTablesGuard.value());
    }
}
