package com.mesaro.reservation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Public-safe reservation view for unauthenticated endpoints.
 * Excludes direct guest contact fields and free-form notes.
 */
public record PublicReservationResponse(
        String confirmationCode,
        int partySize,
        LocalDate date,
        LocalTime time,
        String timezone,
        ReservationStatus status,
        String shiftName,
        List<String> tableLabels
) {
    public static PublicReservationResponse from(Reservation reservation, ZoneId timezone) {
        LocalDate date = reservation.getStartAtUtc().atZone(timezone).toLocalDate();
        LocalTime time = reservation.getStartAtUtc().atZone(timezone).toLocalTime();

        List<String> tableLabels = List.of();

        String shiftName = reservation.getShift() != null ? reservation.getShift().getName() : null;

        return new PublicReservationResponse(
                reservation.getConfirmationCode(),
                reservation.getPartySize(),
                date,
                time,
                timezone.getId(),
                reservation.getStatus(),
                shiftName,
                tableLabels
        );
    }
}
