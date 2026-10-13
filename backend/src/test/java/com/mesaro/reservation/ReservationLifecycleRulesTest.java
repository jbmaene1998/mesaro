package com.mesaro.reservation;

import com.mesaro.common.exception.ConflictException;
import com.mesaro.restaurant.Restaurant;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReservationLifecycleRulesTest {

    private static final ZoneId BRUSSELS = ZoneId.of("Europe/Brussels");

    @Test
    void seat_rejectsDayBeforeServiceDay() {
        // Service: 2026-10-14 19:00 CEST (UTC+2) = 17:00Z
        Reservation reservation = reservation(
                ReservationStatus.CONFIRMED,
                Instant.parse("2026-10-14T17:00:00Z"),
                Instant.parse("2026-10-14T18:30:00Z")
        );
        Instant dayBeforeAfternoon = Instant.parse("2026-10-13T14:00:00Z");

        assertThatThrownBy(() -> ReservationLifecycleRules.assertCanSeat(reservation, dayBeforeAfternoon, BRUSSELS))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("before its service day");
    }

    @Test
    void seat_allowsOnServiceDayBeforeStart() {
        Reservation reservation = reservation(
                ReservationStatus.CONFIRMED,
                Instant.parse("2026-10-14T17:00:00Z"),
                Instant.parse("2026-10-14T18:30:00Z")
        );
        Instant morningOfService = Instant.parse("2026-10-14T08:00:00Z");

        assertThatCode(() -> ReservationLifecycleRules.assertCanSeat(reservation, morningOfService, BRUSSELS))
                .doesNotThrowAnyException();
    }

    @Test
    void seat_rejectsAfterEndTime() {
        Reservation reservation = reservation(
                ReservationStatus.CONFIRMED,
                Instant.parse("2026-10-14T17:00:00Z"),
                Instant.parse("2026-10-14T18:30:00Z")
        );
        Instant afterEnd = Instant.parse("2026-10-14T18:30:00Z");

        assertThatThrownBy(() -> ReservationLifecycleRules.assertCanSeat(reservation, afterEnd, BRUSSELS))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("after its end time");
    }

    @Test
    void noShow_rejectsBeforeStart() {
        Reservation reservation = reservation(
                ReservationStatus.CONFIRMED,
                Instant.parse("2026-10-14T17:00:00Z"),
                Instant.parse("2026-10-14T18:30:00Z")
        );

        assertThatThrownBy(() ->
                ReservationLifecycleRules.assertCanMarkNoShow(reservation, Instant.parse("2026-10-14T16:59:59Z")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("before the reservation start");
    }

    @Test
    void noShow_allowsAtOrAfterStart() {
        Reservation reservation = reservation(
                ReservationStatus.CONFIRMED,
                Instant.parse("2026-10-14T17:00:00Z"),
                Instant.parse("2026-10-14T18:30:00Z")
        );

        assertThatCode(() ->
                ReservationLifecycleRules.assertCanMarkNoShow(reservation, Instant.parse("2026-10-14T17:00:00Z")))
                .doesNotThrowAnyException();
    }

    @Test
    void guestCancel_rejectsAfterStart() {
        Reservation reservation = reservation(
                ReservationStatus.CONFIRMED,
                Instant.parse("2026-10-14T17:00:00Z"),
                Instant.parse("2026-10-14T18:30:00Z")
        );

        assertThatThrownBy(() ->
                ReservationLifecycleRules.assertCanCancel(reservation, Instant.parse("2026-10-14T17:00:00Z"), true))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("after its start time");
    }

    private static Reservation reservation(ReservationStatus status, Instant start, Instant end) {
        Restaurant restaurant = new Restaurant("Demo", "demo", "Europe/Brussels");
        Reservation reservation = new Reservation(
                restaurant,
                null,
                "CODE1",
                "Guest",
                "guest@example.com",
                2,
                start,
                end
        );
        switch (status) {
            case SEATED -> reservation.seat();
            case COMPLETED -> {
                reservation.seat();
                reservation.complete();
            }
            case NO_SHOW -> reservation.markNoShow();
            case CANCELLED -> reservation.cancel();
            case CONFIRMED -> {
            }
        }
        return reservation;
    }
}
