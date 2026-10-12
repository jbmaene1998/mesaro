package com.mesaro.table;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateCombinationRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must not exceed 100 characters")
        String name,

        @NotEmpty(message = "At least one table is required")
        List<Long> tableIds,

        @Min(value = 1, message = "Minimum capacity must be at least 1")
        @Max(value = 100, message = "Minimum capacity must not exceed 100")
        Integer minCapacity,

        @Min(value = 1, message = "Maximum capacity must be at least 1")
        @Max(value = 100, message = "Maximum capacity must not exceed 100")
        Integer maxCapacity
) {
}
