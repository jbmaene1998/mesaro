package com.mesaro.hold;

import com.mesaro.audit.AuditService;
import com.mesaro.billing.BillingService;
import com.mesaro.availability.TableSelectionResult;
import com.mesaro.availability.TableSelectionService;
import com.mesaro.common.exception.ConflictException;
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
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HoldServiceTest {

    @Mock
    private HoldRepository holdRepository;
    @Mock
    private DiningTableLockRepository tableLockRepository;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private RestaurantService restaurantService;
    @Mock
    private BillingService billingService;
    @Mock
    private TableSelectionService tableSelectionService;
    @Mock
    private VacationService vacationService;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private TokenService tokenService;
    @Mock
    private TimeService timeService;
    @Mock
    private AuditService auditService;
    @Mock
    private MeterRegistry meterRegistry;
    @Mock
    private Counter counter;

    private HoldService holdService;

    @BeforeEach
    void setUp() {
        holdService = new HoldService(
                holdRepository,
                tableLockRepository,
                shiftRepository,
                restaurantService,
                billingService,
                tableSelectionService,
                vacationService,
                reservationRepository,
                tokenService,
                timeService,
                auditService,
                meterRegistry
        );
        org.mockito.Mockito.lenient().when(meterRegistry.counter(org.mockito.ArgumentMatchers.anyString())).thenReturn(counter);
        org.mockito.Mockito.lenient().when(meterRegistry.counter(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(counter);
        ReflectionTestUtils.setField(holdService, "holdDurationMinutes", 3);
    }

    @Test
    void createHold_valid_createsHoldAndReturnsToken() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        restaurant.setDefaultDurationMinutes(90);

        DiningTable table = new DiningTable(restaurant, "T1", 4);
        ReflectionTestUtils.setField(table, "id", 10L);

        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.THURSDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), 50);
        ReflectionTestUtils.setField(shift, "id", 50L);
        ReflectionTestUtils.setField(shift, "id", 50L);
        ReflectionTestUtils.setField(shift, "id", 50L);

        LocalDate date = LocalDate.of(2025, 1, 2);
        LocalTime time = LocalTime.of(18, 0);
        Instant now = Instant.parse("2025-01-01T12:00:00Z");
        Instant startUtc = now.plusSeconds(3600);

        when(restaurantService.findBySlug("test")).thenReturn(restaurant);
        when(vacationService.isRestaurantClosed(1L, date)).thenReturn(false);
        when(timeService.now()).thenReturn(now);
        when(timeService.today(ZoneId.of("UTC"))).thenReturn(LocalDate.of(2025, 1, 1));
        when(timeService.toUtc(date, time, ZoneId.of("UTC"))).thenReturn(startUtc);
        when(shiftRepository.findActiveShiftAtTimeIncludingOvernight(eq(1L), eq(date.getDayOfWeek().getValue()), eq(3), eq(time)))
                .thenReturn(List.of(shift));
        when(shiftRepository.findByIdForUpdate(50L)).thenReturn(Optional.of(shift));
        when(tableSelectionService.findBestMatch(eq(restaurant), eq(2), eq(startUtc), any(Instant.class)))
                .thenReturn(new TableSelectionResult.SingleTable(table, 0));
        when(tableLockRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(table));
        when(holdRepository.existsActiveHoldForTables(anyList(), eq(startUtc), any(Instant.class), eq(now)))
                .thenReturn(false);
        when(reservationRepository.existsActiveReservationForTables(anyList(), eq(startUtc), any(Instant.class)))
                .thenReturn(false);
        when(tokenService.generateToken()).thenReturn("raw-token");
        when(tokenService.hashToken("raw-token")).thenReturn("hash-token");
        when(holdRepository.save(any(Hold.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateHoldRequest request = new CreateHoldRequest("test", date, time, 2);
        HoldService.HoldWithToken result = holdService.createHold(request);

        assertEquals("raw-token", result.token());
        assertNotNull(result.hold());
        assertEquals("hash-token", result.hold().getTokenHash());
    }

    @Test
    void findActiveByToken_expired_throwsConflict() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.THURSDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), 50);
        ReflectionTestUtils.setField(shift, "id", 50L);

        Hold hold = new Hold(
                restaurant,
                "hash-token",
                2,
                Instant.parse("2025-01-01T10:00:00Z"),
                Instant.parse("2025-01-01T11:00:00Z"),
                shift,
                Instant.parse("2025-01-01T11:59:59Z")
        );

        when(tokenService.hashToken("raw-token")).thenReturn("hash-token");
        when(holdRepository.findActiveByTokenHash("hash-token")).thenReturn(Optional.of(hold));
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T12:00:00Z"));

        assertThrows(ConflictException.class, () -> holdService.findActiveByToken("raw-token"));
    }

    @Test
    void findActiveByToken_expiresAtNow_throwsConflict() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.THURSDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), 50);

        Hold hold = new Hold(
                restaurant,
                "hash-token",
                2,
                Instant.parse("2025-01-01T10:00:00Z"),
                Instant.parse("2025-01-01T11:00:00Z"),
                shift,
                Instant.parse("2025-01-01T12:00:00Z")
        );

        when(tokenService.hashToken("raw-token")).thenReturn("hash-token");
        when(holdRepository.findActiveByTokenHash("hash-token")).thenReturn(Optional.of(hold));
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T12:00:00Z"));

        assertThrows(ConflictException.class, () -> holdService.findActiveByToken("raw-token"));
    }

    @Test
    void createHold_hashesTokenBeforeSaving() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        restaurant.setDefaultDurationMinutes(90);

        DiningTable table = new DiningTable(restaurant, "T1", 4);
        ReflectionTestUtils.setField(table, "id", 10L);

        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.THURSDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), 50);
        ReflectionTestUtils.setField(shift, "id", 50L);

        LocalDate date = LocalDate.of(2025, 1, 2);
        LocalTime time = LocalTime.of(18, 0);
        Instant now = Instant.parse("2025-01-01T12:00:00Z");
        Instant startUtc = now.plusSeconds(3600);

        when(restaurantService.findBySlug("test"))
                .thenReturn(restaurant);
        when(vacationService.isRestaurantClosed(1L, date)).thenReturn(false);
        when(timeService.now()).thenReturn(now);
        when(timeService.today(ZoneId.of("UTC"))).thenReturn(LocalDate.of(2025, 1, 1));
        when(timeService.toUtc(date, time, ZoneId.of("UTC"))).thenReturn(startUtc);
        when(shiftRepository.findActiveShiftAtTimeIncludingOvernight(eq(1L), eq(date.getDayOfWeek().getValue()), eq(3), eq(time)))
                .thenReturn(List.of(shift));
        when(shiftRepository.findByIdForUpdate(50L)).thenReturn(Optional.of(shift));
        when(tableSelectionService.findBestMatch(eq(restaurant), eq(2), eq(startUtc), any(Instant.class)))
                .thenReturn(new TableSelectionResult.SingleTable(table, 0));
        when(tableLockRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(table));
        when(holdRepository.existsActiveHoldForTables(anyList(), eq(startUtc), any(Instant.class), eq(now)))
                .thenReturn(false);
        when(reservationRepository.existsActiveReservationForTables(anyList(), eq(startUtc), any(Instant.class)))
                .thenReturn(false);
        when(tokenService.generateToken()).thenReturn("raw-token");
        when(tokenService.hashToken("raw-token")).thenReturn("hash-token");
        when(holdRepository.save(any(Hold.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateHoldRequest request = new CreateHoldRequest("test", date, time, 2);
        holdService.createHold(request);

        ArgumentCaptor<Hold> holdCaptor = ArgumentCaptor.forClass(Hold.class);
        verify(holdRepository).save(holdCaptor.capture());
        verify(tokenService).hashToken("raw-token");
        assertEquals("hash-token", holdCaptor.getValue().getTokenHash());
    }

    @Test
    void createHold_whenActiveReservationFoundInCriticalSection_throwsConflict() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);
        restaurant.setDefaultDurationMinutes(90);

        DiningTable table = new DiningTable(restaurant, "T1", 4);
        ReflectionTestUtils.setField(table, "id", 10L);

        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.THURSDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), 50);
        ReflectionTestUtils.setField(shift, "id", 50L);

        LocalDate date = LocalDate.of(2025, 1, 2);
        LocalTime time = LocalTime.of(18, 0);
        Instant now = Instant.parse("2025-01-01T12:00:00Z");
        Instant startUtc = now.plusSeconds(3600);

        when(restaurantService.findBySlug("test")).thenReturn(restaurant);
        when(vacationService.isRestaurantClosed(1L, date)).thenReturn(false);
        when(timeService.now()).thenReturn(now);
        when(timeService.today(ZoneId.of("UTC"))).thenReturn(LocalDate.of(2025, 1, 1));
        when(timeService.toUtc(date, time, ZoneId.of("UTC"))).thenReturn(startUtc);
        when(shiftRepository.findActiveShiftAtTimeIncludingOvernight(eq(1L), eq(date.getDayOfWeek().getValue()), eq(3), eq(time)))
                .thenReturn(List.of(shift));
        when(shiftRepository.findByIdForUpdate(50L)).thenReturn(Optional.of(shift));
        when(tableSelectionService.findBestMatch(eq(restaurant), eq(2), eq(startUtc), any(Instant.class)))
                .thenReturn(new TableSelectionResult.SingleTable(table, 0));
        when(tableLockRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(table));
        when(holdRepository.existsActiveHoldForTables(anyList(), eq(startUtc), any(Instant.class), eq(now)))
                .thenReturn(false);
        when(reservationRepository.existsActiveReservationForTables(anyList(), eq(startUtc), any(Instant.class)))
                .thenReturn(true);

        CreateHoldRequest request = new CreateHoldRequest("test", date, time, 2);

        assertThrows(ConflictException.class, () -> holdService.createHold(request));
    }
}
