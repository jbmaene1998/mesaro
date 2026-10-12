package com.mesaro.vacation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateClosureRequest(
        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "End date is required")
        LocalDate endDate,

        @NotNull(message = "Reason is required")
        ClosureReason reason,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
