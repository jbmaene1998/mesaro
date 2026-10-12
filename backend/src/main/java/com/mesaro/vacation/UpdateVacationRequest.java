package com.mesaro.vacation;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateVacationRequest(
        LocalDate startDate,
        LocalDate endDate,
        ClosureReason closureReason,
        VacationReason vacationReason,
        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
