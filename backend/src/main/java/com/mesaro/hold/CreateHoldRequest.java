package com.mesaro.hold;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateHoldRequest(
        @NotBlank(message = "Restaurant slug is required")
        String restaurantSlug,

        @NotNull(message = "Date is required")
        LocalDate date,

        @NotNull(message = "Time is required")
        LocalTime time,

        Integer utcOffsetMinutes,

        @NotNull(message = "Party size is required")
        @Min(value = 1, message = "Party size must be at least 1")
        Integer partySize
) {
    public CreateHoldRequest(String restaurantSlug, LocalDate date, LocalTime time, Integer partySize) {
        this(restaurantSlug, date, time, null, partySize);
    }
}
