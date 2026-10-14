package com.mesaro.reservation;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Result of confirming a hold into a reservation.
 * Contains both the reservation details and the cancel token (returned once).
 */
public record ConfirmationResult(
        String confirmationCode,
        String cancelToken,
        Instant cancelTokenExpiresAt,
        String guestName,
        String guestEmail,
        int partySize,
        LocalDate date,
        LocalTime time,
        String timezone,
        String shiftName,
        List<String> tableLabels
) {
    public static ConfirmationResult from(Reservation reservation, String cancelToken, ZoneId timezone) {
        LocalDate date = reservation.getStartAtUtc().atZone(timezone).toLocalDate();
        LocalTime time = reservation.getStartAtUtc().atZone(timezone).toLocalTime();

        List<String> tableLabels = List.of();

        String shiftName = reservation.getShift() != null ? reservation.getShift().getName() : null;

        return new ConfirmationResult(
                reservation.getConfirmationCode(),
                cancelToken,
                reservation.getCancelTokenExpiresAtUtc(),
                reservation.getGuestName(),
                reservation.getGuestEmail(),
                reservation.getPartySize(),
                date,
                time,
                timezone.getId(),
                shiftName,
                tableLabels
        );
    }
}
