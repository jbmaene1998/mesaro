package com.mesaro.reservation;

import com.mesaro.common.exception.ConflictException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Time and status boundaries for reservation lifecycle actions.
 * Service day / clock comparisons use the restaurant timezone.
 */
public final class ReservationLifecycleRules {

    private ReservationLifecycleRules() {
    }

    public static LocalDate serviceDate(Reservation reservation, ZoneId timezone) {
        return reservation.getStartAtUtc().atZone(timezone).toLocalDate();
    }

    public static LocalDate today(Instant now, ZoneId timezone) {
        return now.atZone(timezone).toLocalDate();
    }

    public static void assertCanSeat(Reservation reservation, Instant now, ZoneId timezone) {
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ConflictException(
                    "Can only seat CONFIRMED reservations, current status: " + reservation.getStatus(),
                    "status"
            );
        }

        LocalDate service = serviceDate(reservation, timezone);
        LocalDate restaurantToday = today(now, timezone);
        if (restaurantToday.isBefore(service)) {
            throw new ConflictException(
                    "Cannot seat a reservation before its service day (" + service + ")",
                    "status"
            );
        }

        if (!now.isBefore(reservation.getEndAtUtc())) {
            throw new ConflictException(
                    "Cannot seat a reservation after its end time",
                    "status"
            );
        }
    }

    public static void assertCanComplete(Reservation reservation) {
        if (reservation.getStatus() != ReservationStatus.SEATED) {
            throw new ConflictException(
                    "Can only complete SEATED reservations, current status: " + reservation.getStatus(),
                    "status"
            );
        }
    }

    public static void assertCanMarkNoShow(Reservation reservation, Instant now) {
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ConflictException(
                    "Can only mark CONFIRMED reservations as no-show, current status: " + reservation.getStatus(),
                    "status"
            );
        }

        if (now.isBefore(reservation.getStartAtUtc())) {
            throw new ConflictException(
                    "Cannot mark no-show before the reservation start time",
                    "status"
            );
        }
    }

    public static void assertCanCancel(Reservation reservation, Instant now, boolean enforceStartBoundary) {
        if (!reservation.isCancellable()) {
            throw new ConflictException(
                    "Reservation cannot be cancelled in status: " + reservation.getStatus(),
                    "status"
            );
        }

        if (enforceStartBoundary && !now.isBefore(reservation.getStartAtUtc())) {
            throw new ConflictException(
                    "Cannot cancel a reservation after its start time",
                    "status"
            );
        }
    }

    public static boolean canSeat(Reservation reservation, Instant now, ZoneId timezone) {
        try {
            assertCanSeat(reservation, now, timezone);
            return true;
        } catch (ConflictException ex) {
            return false;
        }
    }
}
