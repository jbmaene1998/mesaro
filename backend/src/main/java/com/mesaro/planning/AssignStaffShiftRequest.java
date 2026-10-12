package com.mesaro.planning;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record AssignStaffShiftRequest(
        @NotNull Long shiftId,
        @NotNull Long userId,
        @NotNull LocalDate serviceDate,
        LocalTime startTime,
        LocalTime endTime
) {
}
