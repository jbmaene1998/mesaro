package com.mesaro.table;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTableRequest(
        @NotBlank(message = "Label is required")
        @Size(max = 50, message = "Label must not exceed 50 characters")
        String label,

        @Min(value = 1, message = "Seats must be at least 1")
        @Max(value = 50, message = "Seats must not exceed 50")
        int seats
) {
}
