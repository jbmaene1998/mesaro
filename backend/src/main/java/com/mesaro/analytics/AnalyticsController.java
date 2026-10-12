package com.mesaro.analytics;

import com.mesaro.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Analytics", description = "Public analytics event intake")
@Validated
public class AnalyticsController {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsController.class);
    private static final int MAX_PROPERTIES = 25;
    private static final Set<String> FORBIDDEN_PROPERTY_KEYS = Set.of(
            "email", "guest_email", "phone", "guest_phone", "name", "guest_name",
            "full_name", "first_name", "last_name", "address", "password", "token",
            "canceltoken", "cancel_token", "holdtoken", "hold_token", "search", "query"
    );

    @PostMapping("/events")
    @Operation(summary = "Capture analytics event", description = "Accept frontend analytics events")
    public ApiResponse<Void> captureEvent(@Valid @RequestBody AnalyticsEventRequest request) {
        Map<String, Object> sanitizedProperties = sanitizeProperties(request.properties());
        int propertyCount = sanitizedProperties.size();
        log.info("Analytics event: event='{}', page='{}', pathname='{}', occurredAt='{}', properties={}",
                request.event(),
                request.page(),
                request.pathname(),
                request.occurredAt(),
                propertyCount);
        return ApiResponse.success(null);
    }

    private Map<String, Object> sanitizeProperties(Map<String, Object> properties) {
        if (properties == null || properties.isEmpty()) {
            return Map.of();
        }

        return properties.entrySet().stream()
                .filter(entry -> isAllowedPropertyKey(entry.getKey()))
                .limit(MAX_PROPERTIES)
                .collect(java.util.stream.Collectors.toUnmodifiableMap(
                        Map.Entry::getKey,
                        entry -> normalizePropertyValue(entry.getValue())
                ));
    }

    private boolean isAllowedPropertyKey(String key) {
        String normalized = key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return false;
        }
        return !FORBIDDEN_PROPERTY_KEYS.contains(normalized);
    }

    private Object normalizePropertyValue(Object value) {
        if (value == null || value instanceof Number || value instanceof Boolean) {
            return value;
        }
        String stringValue = String.valueOf(value);
        if (stringValue.length() <= 120) {
            return stringValue;
        }
        return stringValue.substring(0, 120);
    }
}
