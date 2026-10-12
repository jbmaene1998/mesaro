package com.mesaro.vacation;

import jakarta.validation.constraints.Size;

public record RejectVacationRequest(
        @Size(max = 500, message = "Reason must not exceed 500 characters")
        String reason
) {
}
