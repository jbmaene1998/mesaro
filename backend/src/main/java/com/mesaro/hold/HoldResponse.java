package com.mesaro.hold;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

public record HoldResponse(
        String holdToken,
        Instant expiresAt,
        int partySize,
        LocalDate date,
        LocalTime time,
        String timezone,
        String shiftName,
        List<String> tableLabels
) {
    public static HoldResponse from(Hold hold, String token, ZoneId timezone) {
        LocalDate date = hold.getStartAtUtc().atZone(timezone).toLocalDate();
        LocalTime time = hold.getStartAtUtc().atZone(timezone).toLocalTime();

        List<String> tableLabels = hold.getTables().stream()
                .map(t -> t.getLabel())
                .sorted()
                .toList();

        String shiftName = hold.getShift() != null ? hold.getShift().getName() : null;

        return new HoldResponse(
                token,
                hold.getExpiresAtUtc(),
                hold.getPartySize(),
                date,
                time,
                timezone.getId(),
                shiftName,
                tableLabels
        );
    }
}
