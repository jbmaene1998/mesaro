package com.mesaro.shift;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record UpdateShiftRequest(
        @Size(max = 50, message = "Name must not exceed 50 characters")
        String name,

        @Min(value = 1, message = "Day of week must be between 1 (Monday) and 7 (Sunday)")
        @Max(value = 7, message = "Day of week must be between 1 (Monday) and 7 (Sunday)")
        Integer dayOfWeek,

        LocalTime startTime,

        LocalTime endTime,

        LocalTime lastReservationTime,

        @Min(value = 1, message = "Max covers must be at least 1")
        @Max(value = 500, message = "Max covers must not exceed 500")
        Integer maxCovers,

        @Min(value = 5, message = "Slot duration must be at least 5 minutes")
        @Max(value = 60, message = "Slot duration must not exceed 60 minutes")
        Integer slotDurationMinutes,

        ShiftStatus status
) {
}
