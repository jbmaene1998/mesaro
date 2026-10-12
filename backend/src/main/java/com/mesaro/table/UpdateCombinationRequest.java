package com.mesaro.table;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateCombinationRequest(
        @Size(max = 100, message = "Name must not exceed 100 characters")
        String name,

        List<Long> tableIds,

        @Min(value = 1, message = "Minimum capacity must be at least 1")
        @Max(value = 100, message = "Minimum capacity must not exceed 100")
        Integer minCapacity,

        @Min(value = 1, message = "Maximum capacity must be at least 1")
        @Max(value = 100, message = "Maximum capacity must not exceed 100")
        Integer maxCapacity
) {
}
