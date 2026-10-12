package com.mesaro.availability;

import java.time.Instant;
import java.time.LocalTime;

public record TimeSlot(
        LocalTime time,
        Instant timeUtc,
        Long shiftId,
        String shiftName,
        boolean available,
        String unavailableReason
) {
    public static TimeSlot available(LocalTime time, Instant timeUtc, Long shiftId, String shiftName) {
        return new TimeSlot(time, timeUtc, shiftId, shiftName, true, null);
    }

    public static TimeSlot unavailable(LocalTime time, Instant timeUtc, Long shiftId, String shiftName, String reason) {
        return new TimeSlot(time, timeUtc, shiftId, shiftName, false, reason);
    }
}
