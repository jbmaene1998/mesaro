package com.mesaro.planning;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpsertWeeklyWorkHoursRequest(
        @NotNull Long userId,
        @NotNull LocalDate weekStartDate,
        @NotNull
        @DecimalMin(value = "0.00")
        @Digits(integer = 4, fraction = 2)
        BigDecimal plannedHours
) {
}
