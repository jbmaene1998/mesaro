package com.mesaro.analytics;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public record AnalyticsEventRequest(
        @NotBlank(message = "Event is required")
        @Size(max = 120, message = "Event must not exceed 120 characters")
        @Pattern(regexp = "^[a-z0-9_]+$", message = "Event must be lowercase alphanumeric with underscores")
        String event,

        @Size(max = 120, message = "Page must not exceed 120 characters")
        String page,

        @Size(max = 255, message = "Pathname must not exceed 255 characters")
        String pathname,

        Map<String, Object> properties,

        @NotNull(message = "Occurred at is required")
        Instant occurredAt
) {
}
