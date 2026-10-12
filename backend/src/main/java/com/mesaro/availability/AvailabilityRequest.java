package com.mesaro.availability;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AvailabilityRequest(
        @NotBlank(message = "Restaurant slug is required")
        String restaurantSlug,

        @NotNull(message = "Date is required")
        LocalDate date,

        @NotNull(message = "Party size is required")
        @Min(value = 1, message = "Party size must be at least 1")
        Integer partySize
) {
}
