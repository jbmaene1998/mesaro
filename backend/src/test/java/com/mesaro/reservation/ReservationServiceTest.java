package com.mesaro.reservation;

import com.mesaro.audit.AuditService;
import com.mesaro.billing.BillingService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.hold.Hold;
import com.mesaro.hold.HoldRepository;
import com.mesaro.hold.HoldService;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableLockRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private HoldRepository holdRepository;
    @Mock
    private DiningTableLockRepository tableLockRepository;
    @Mock
    private HoldService holdService;
    @Mock
    private TokenService tokenService;
    @Mock
    private TimeService timeService;
    @Mock
    private AuditService auditService;
    @Mock
    private com.mesaro.email.ReservationConfirmationEmailSender emailSender;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private RestaurantService restaurantService;
    @Mock
    private BillingService billingService;
    @Mock
    private MeterRegistry meterRegistry;
    @Mock
    private Counter counter;

    private ReservationService reservationService;

    @BeforeEach
    void setUp() {
        reservationService = new ReservationService(
                reservationRepository,
                holdRepository,
                tableLockRepository,
                holdService,
                tokenService,
                timeService,
                auditService,
                emailSender,
                emailService,
                shiftRepository,
                restaurantService,
                billingService,
                meterRegistry
        );
        org.mockito.Mockito.lenient().when(meterRegistry.counter(org.mockito.ArgumentMatchers.anyString())).thenReturn(counter);
        org.mockito.Mockito.lenient().when(meterRegistry.counter(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(counter);
    }

    @Test
    void seat_validTransition_setsSeated() {
        Reservation reservation = buildReservation(ReservationStatus.CONFIRMED);
        when(reservationRepository.findByIdWithAssociations(10L)).thenReturn(Optional.of(reservation));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T00:00:00Z"));

        Reservation result = reservationService.seat(10L);

        assertThat(result.getStatus()).isEqualTo(ReservationStatus.SEATED);
    }

    @Test
    void seat_illegalTransition_throws() {
        Reservation reservation = buildReservation(ReservationStatus.CANCELLED);
        when(reservationRepository.findByIdWithAssociations(10L)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reservationService.seat(10L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void complete_validTransition_setsCompleted() {
        Reservation reservation = buildReservation(ReservationStatus.SEATED);
        when(reservationRepository.findByIdWithAssociations(10L)).thenReturn(Optional.of(reservation));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T00:00:00Z"));

        Reservation result = reservationService.complete(10L);

        assertThat(result.getStatus()).isEqualTo(ReservationStatus.COMPLETED);
    }

    @Test
    void complete_illegalTransition_throws() {
        Reservation reservation = buildReservation(ReservationStatus.CONFIRMED);
        when(reservationRepository.findByIdWithAssociations(10L)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reservationService.complete(10L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void cancelByToken_expiredToken_throws() {
        Reservation reservation = buildReservation(ReservationStatus.CONFIRMED);
        reservation.setCancelTokenExpiresAtUtc(Instant.parse("2025-01-01T00:00:00Z"));

        when(tokenService.hashToken("token")).thenReturn("hash");
        when(reservationRepository.findByCancelTokenHashWithAssociations("hash")).thenReturn(Optional.of(reservation));
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T00:00:00Z"));

        assertThatThrownBy(() -> reservationService.cancelByToken("token"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void confirm_lockMismatch_throwsConflict() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        DiningTable table1 = new DiningTable(restaurant, "T1", 2);
        ReflectionTestUtils.setField(table1, "id", 10L);
        DiningTable table2 = new DiningTable(restaurant, "T2", 2);
        ReflectionTestUtils.setField(table2, "id", 20L);
        Shift shift = new Shift(restaurant, "Lunch", java.time.DayOfWeek.WEDNESDAY,
                java.time.LocalTime.of(12, 0), java.time.LocalTime.of(14, 0), 20);
        ReflectionTestUtils.setField(shift, "id", 30L);

        Hold hold = new Hold(
                restaurant,
                "hold-hash",
                2,
                Instant.parse("2025-01-01T12:00:00Z"),
                Instant.parse("2025-01-01T13:00:00Z"),
                shift,
                Instant.parse("2025-01-01T11:10:00Z")
        );
        hold.addTables(Set.of(table1, table2));

        ConfirmHoldRequest request = new ConfirmHoldRequest("Guest", "guest@example.com", null, null);

        when(tokenService.hashToken("hold-token")).thenReturn("hold-hash");
        when(holdRepository.findByTokenHashForUpdate("hold-hash")).thenReturn(Optional.of(hold));
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T11:00:00Z"));
        when(restaurantService.findById(1L)).thenReturn(restaurant);
        when(shiftRepository.findByIdForUpdate(30L)).thenReturn(Optional.of(shift));
        when(tableLockRepository.findByIdsForUpdate(List.of(10L, 20L))).thenReturn(List.of(table1));

        assertThatThrownBy(() -> reservationService.confirm("hold-token", request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("no longer available");

        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void cancelByCodeAndToken_mismatch_throwsNotFound() {
        when(tokenService.hashToken("token")).thenReturn("hash");
        when(reservationRepository.findByConfirmationCodeAndCancelTokenHashWithAssociations("RES-1", "hash"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> reservationService.cancelByCodeAndToken("RES-1", "token"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void confirm_alreadyConfirmedHold_returnsExistingReservation() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        DiningTable table = new DiningTable(restaurant, "T1", 2);
        ReflectionTestUtils.setField(table, "id", 10L);

        Hold hold = new Hold(
                restaurant,
                "hold-hash",
                2,
                Instant.parse("2025-01-01T12:00:00Z"),
                Instant.parse("2025-01-01T13:00:00Z"),
                null,
                Instant.parse("2025-01-01T12:05:00Z")
        );
        hold.addTable(table);
        ReflectionTestUtils.setField(hold, "confirmed", true);

        Reservation existing = new Reservation(
                restaurant,
                null,
                "RES-2025-000001",
                "Guest",
                "guest@example.com",
                2,
                Instant.parse("2025-01-01T12:00:00Z"),
                Instant.parse("2025-01-01T13:00:00Z")
        );
        existing.addTable(table);

        when(tokenService.hashToken("hold-token")).thenReturn("hold-hash");
        when(tokenService.generateToken()).thenReturn("reissued-token");
        when(tokenService.hashToken("reissued-token")).thenReturn("reissued-token-hash");
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T12:10:00Z"));
        when(holdRepository.findByTokenHashForUpdate("hold-hash")).thenReturn(Optional.of(hold));
        when(reservationRepository.findByRestaurantAndDateRange(
                1L,
                Instant.parse("2025-01-01T12:00:00Z"),
                Instant.parse("2025-01-01T12:00:01Z")))
                .thenReturn(List.of(existing));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ConfirmationResult result = reservationService.confirm(
                "hold-token",
                new ConfirmHoldRequest("Guest", "guest@example.com", null, null)
        );

        assertThat(result.confirmationCode()).isEqualTo("RES-2025-000001");
        assertThat(result.cancelToken()).isEqualTo("reissued-token");
        verify(reservationRepository).save(any(Reservation.class));
    }

    @Test
    void confirm_capacityBoundary_includingCurrentHold_doesNotDoubleCount() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        restaurant.setName("Test Restaurant");
        Shift shift = new Shift(restaurant, "Lunch", java.time.DayOfWeek.WEDNESDAY,
                java.time.LocalTime.of(12, 0), java.time.LocalTime.of(14, 0), 10);
        ReflectionTestUtils.setField(shift, "id", 99L);
        DiningTable table = new DiningTable(restaurant, "T1", 4);
        ReflectionTestUtils.setField(table, "id", 10L);

        Hold hold = new Hold(
                restaurant,
                "hold-hash",
                2,
                Instant.parse("2025-01-01T12:00:00Z"),
                Instant.parse("2025-01-01T13:00:00Z"),
                shift,
                Instant.parse("2025-01-01T12:30:00Z")
        );
        hold.setStartLocalText("2025-01-01T12:00");
        hold.addTable(table);

        when(tokenService.hashToken("hold-token")).thenReturn("hold-hash");
        when(tokenService.generateToken()).thenReturn("cancel-token");
        when(holdRepository.findByTokenHashForUpdate("hold-hash")).thenReturn(Optional.of(hold));
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T12:00:00Z"));
        when(restaurantService.findById(1L)).thenReturn(restaurant);
        when(shiftRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(shift));
        when(tableLockRepository.findByIdsForUpdate(List.of(10L))).thenReturn(List.of(table));
        when(reservationRepository.existsActiveReservationForTables(any(), any(), any())).thenReturn(false);
        when(reservationRepository.countCoversForShift(eq(99L), any(), any())).thenReturn(8);
        when(holdRepository.countActiveHoldCoversForShift(eq(99L), any(), any(), any())).thenReturn(2);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ConfirmationResult result = reservationService.confirm(
                "hold-token",
                new ConfirmHoldRequest("Guest", "guest@example.com", "555", null)
        );

        assertThat(result).isNotNull();
    }

    private Reservation buildReservation(ReservationStatus status) {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        Reservation reservation = new Reservation(
                restaurant,
                null,
                "CONF-1",
                "Guest",
                "guest@example.com",
                2,
                Instant.parse("2025-01-01T12:00:00Z"),
                Instant.parse("2025-01-01T13:00:00Z")
        );
        ReflectionTestUtils.setField(reservation, "id", 10L);
        ReflectionTestUtils.setField(reservation, "status", status);
        return reservation;
    }
}
