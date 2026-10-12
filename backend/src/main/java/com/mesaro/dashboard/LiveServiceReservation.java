package com.mesaro.dashboard;

import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationStatus;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public record LiveServiceReservation(
        Long id,
        String guestName,
        int partySize,
        String startTime,
        String endTime,
        ReservationStatus status
) {
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public static LiveServiceReservation from(Reservation reservation, ZoneId timezone) {
        return new LiveServiceReservation(
                reservation.getId(),
                reservation.getGuestName(),
                reservation.getPartySize(),
                reservation.getStartAtUtc().atZone(timezone).format(TIME_FORMATTER),
                reservation.getEndAtUtc().atZone(timezone).format(TIME_FORMATTER),
                reservation.getStatus()
        );
    }
}
