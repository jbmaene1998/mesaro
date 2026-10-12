package com.mesaro.reservation;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

public record ReservationResponse(
        Long id,
        String confirmationCode,
        String guestName,
        String guestEmail,
        String guestPhone,
        int partySize,
        LocalDate date,
        LocalTime time,
        String timezone,
        Instant startAtUtc,
        Instant endAtUtc,
        ReservationStatus status,
        long version,
        String shiftName,
        List<String> tableLabels,
        String notes,
        Instant createdAt
) {
    public static ReservationResponse from(Reservation reservation, ZoneId timezone) {
        LocalDate date = reservation.getStartAtUtc().atZone(timezone).toLocalDate();
        LocalTime time = reservation.getStartAtUtc().atZone(timezone).toLocalTime();

        List<String> tableLabels = reservation.getTables().stream()
                .map(t -> t.getLabel())
                .sorted()
                .toList();

        String shiftName = reservation.getShift() != null ? reservation.getShift().getName() : null;

        return new ReservationResponse(
                reservation.getId(),
                reservation.getConfirmationCode(),
                reservation.getGuestName(),
                reservation.getGuestEmail(),
                reservation.getGuestPhone(),
                reservation.getPartySize(),
                date,
                time,
                timezone.getId(),
                reservation.getStartAtUtc(),
                reservation.getEndAtUtc(),
                reservation.getStatus(),
                reservation.getVersion(),
                shiftName,
                tableLabels,
                reservation.getNotes(),
                reservation.getCreatedAt()
        );
    }
}
