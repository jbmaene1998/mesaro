package com.mesaro.vacation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateVacationRequest(
        @NotNull(message = "Type is required")
        VacationType type,

        Long userId,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "End date is required")
        LocalDate endDate,

        ClosureReason closureReason,

        VacationReason vacationReason,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
