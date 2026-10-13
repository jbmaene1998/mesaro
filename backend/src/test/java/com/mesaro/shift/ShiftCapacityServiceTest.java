package com.mesaro.shift;

import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.TimeService;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.restaurant.Restaurant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShiftCapacityServiceTest {

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private HoldRepository holdRepository;
    @Mock
    private TimeService timeService;

    private ShiftCapacityService service;
    private ZoneId zone;

    @BeforeEach
    void setUp() {
        service = new ShiftCapacityService(reservationRepository, holdRepository, timeService);
        zone = ZoneId.of("Europe/Brussels");
    }

    @Test
    void overnightOccurrence_sharesWindowAcrossMidnight() {
        Restaurant restaurant = new Restaurant("R", "r", "Europe/Brussels");
        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.FRIDAY,
                LocalTime.of(18, 0), LocalTime.of(2, 0), 20);
        ReflectionTestUtils.setField(shift, "id", 1L);

        LocalDate friday = LocalDate.of(2026, 10, 9);
        LocalDate saturday = friday.plusDays(1);

        Instant startUtc = Instant.parse("2026-10-09T16:00:00Z");
        Instant endUtc = Instant.parse("2026-10-10T00:00:00Z");
        when(timeService.toUtc(eq(friday), eq(LocalTime.of(18, 0)), eq(zone))).thenReturn(startUtc);
        when(timeService.toUtc(eq(saturday), eq(LocalTime.of(2, 0)), eq(zone))).thenReturn(endUtc);

        ShiftCapacityService.OccurrenceWindow friWindow =
                service.occurrenceWindow(shift, friday, LocalTime.of(22, 0), zone);
        ShiftCapacityService.OccurrenceWindow satWindow =
                service.occurrenceWindow(shift, saturday, LocalTime.of(0, 30), zone);

        assertThat(friWindow.startUtc()).isEqualTo(startUtc);
        assertThat(friWindow.endUtc()).isEqualTo(endUtc);
        assertThat(satWindow.startUtc()).isEqualTo(friWindow.startUtc());
        assertThat(satWindow.endUtc()).isEqualTo(friWindow.endUtc());
        assertThat(friWindow.serviceStartDate()).isEqualTo(friday);
        assertThat(satWindow.serviceStartDate()).isEqualTo(friday);
    }

    @Test
    void durationFitsService_allowsCrossingMidnightWithinShift() {
        Restaurant restaurant = new Restaurant("R", "r", "UTC");
        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.FRIDAY,
                LocalTime.of(18, 0), LocalTime.of(2, 0), 20);

        assertThat(service.durationFitsService(shift, LocalDate.of(2026, 10, 9), LocalTime.of(23, 0), 90))
                .isTrue();
        assertThat(service.durationFitsService(shift, LocalDate.of(2026, 10, 9), LocalTime.of(23, 0), 240))
                .isFalse();
    }

    @Test
    void totalCovers_sumsReservationsAndHolds() {
        when(reservationRepository.countCoversForShift(eq(1L), any(), any())).thenReturn(8);
        when(holdRepository.countActiveHoldCoversForShift(eq(1L), any(), any(), any())).thenReturn(4);

        ShiftCapacityService.OccurrenceWindow window = new ShiftCapacityService.OccurrenceWindow(
                Instant.parse("2026-10-09T16:00:00Z"),
                Instant.parse("2026-10-10T00:00:00Z"),
                LocalDate.of(2026, 10, 9));

        assertThat(service.totalCovers(1L, window, Instant.parse("2026-10-09T12:00:00Z"))).isEqualTo(12);
    }
}
