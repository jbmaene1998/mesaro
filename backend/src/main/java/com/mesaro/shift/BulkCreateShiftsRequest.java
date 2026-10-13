package com.mesaro.shift;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BulkCreateShiftsRequest(
        @NotEmpty(message = "At least one shift is required")
        @Valid
        List<CreateShiftRequest> shifts,

        @NotNull(message = "activate flag is required")
        Boolean activate
) {
    public BulkCreateShiftsRequest {
        if (activate == null) {
            activate = true;
        }
    }
}
