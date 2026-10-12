package com.mesaro.dashboard;

import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationStatus;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Summary of an upcoming reservation for dashboard display.
 */
public record UpcomingReservation(
        Long id,
        String confirmationCode,
        LocalTime time,
        String guestName,
        int partySize,
        ReservationStatus status,
        String shiftName,
        List<String> tableLabels
) {
    public static UpcomingReservation from(Reservation reservation, ZoneId timezone) {
        LocalTime time = reservation.getStartAtUtc().atZone(timezone).toLocalTime();

        List<String> tableLabels = reservation.getTables().stream()
                .map(t -> t.getLabel())
                .sorted()
                .toList();

        String shiftName = reservation.getShift() != null ? reservation.getShift().getName() : null;

        return new UpcomingReservation(
                reservation.getId(),
                reservation.getConfirmationCode(),
                time,
                reservation.getGuestName(),
                reservation.getPartySize(),
                reservation.getStatus(),
                shiftName,
                tableLabels
        );
    }
}
