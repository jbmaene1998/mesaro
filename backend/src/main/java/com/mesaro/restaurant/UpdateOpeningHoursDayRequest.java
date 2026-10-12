package com.mesaro.restaurant;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record UpdateOpeningHoursDayRequest(
        @NotNull(message = "Day of week is required")
        @Min(value = 1, message = "Day of week must be between 1 and 7")
        @Max(value = 7, message = "Day of week must be between 1 and 7")
        Integer dayOfWeek,

        @NotNull(message = "Open flag is required")
        Boolean open,

        @JsonFormat(pattern = "HH:mm")
        LocalTime openLocalTime,

        @JsonFormat(pattern = "HH:mm")
        LocalTime closeLocalTime
) {
}
