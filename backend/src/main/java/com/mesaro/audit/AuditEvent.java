package com.mesaro.audit;

import java.time.Instant;
import java.util.Map;

/**
 * Immutable audit event record.
 * Events are logged and can be persisted for compliance.
 */
public record AuditEvent(
        String eventType,
        Long restaurantId,
        Long userId,
        Long entityId,
        String entityType,
        Map<String, Object> details,
        Instant timestamp
) {
    public static AuditEvent create(String eventType, Long restaurantId, Long userId,
                                     Long entityId, String entityType, Map<String, Object> details) {
        return new AuditEvent(eventType, restaurantId, userId, entityId, entityType, details, Instant.now());
    }
}
