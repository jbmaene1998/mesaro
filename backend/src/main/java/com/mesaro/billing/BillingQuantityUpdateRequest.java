package com.mesaro.billing;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record BillingQuantityUpdateRequest(
        @NotNull(message = "quantity is required")
        @Min(value = 1, message = "quantity must be at least 1")
        Integer quantity
) {}
