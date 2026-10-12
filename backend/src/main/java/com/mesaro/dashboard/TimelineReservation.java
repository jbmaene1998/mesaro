package com.mesaro.dashboard;

import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationStatus;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

public record TimelineReservation(
        Long id,
        String confirmationCode,
        LocalTime startTime,
        LocalTime endTime,
        String guestName,
        int partySize,
        ReservationStatus status,
        String shiftName,
        List<String> tableLabels
) {
    public static TimelineReservation from(Reservation reservation, ZoneId timezone) {
        LocalTime startTime = reservation.getStartAtUtc().atZone(timezone).toLocalTime();
        LocalTime endTime = reservation.getEndAtUtc().atZone(timezone).toLocalTime();

        List<String> tableLabels = reservation.getTables().stream()
                .map(table -> table.getLabel())
                .sorted()
                .toList();

        String shiftName = reservation.getShift() != null ? reservation.getShift().getName() : null;

        return new TimelineReservation(
                reservation.getId(),
                reservation.getConfirmationCode(),
                startTime,
                endTime,
                reservation.getGuestName(),
                reservation.getPartySize(),
                reservation.getStatus(),
                shiftName,
                tableLabels
        );
    }
}
