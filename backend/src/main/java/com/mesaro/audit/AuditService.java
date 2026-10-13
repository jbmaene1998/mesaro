package com.mesaro.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.logging.ElasticsearchAuditEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Service for recording audit events.
 * Logs to file, persists to database, and dual-writes to Elasticsearch (all best-effort).
 */
@Service
public class AuditService {

    private static final Logger auditLog = LoggerFactory.getLogger("audit");
    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;
    private final ElasticsearchAuditEventPublisher elasticsearchAuditEventPublisher;

    public AuditService(
            AuditEventRepository auditEventRepository,
            ObjectMapper objectMapper,
            ElasticsearchAuditEventPublisher elasticsearchAuditEventPublisher) {
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
        this.elasticsearchAuditEventPublisher = elasticsearchAuditEventPublisher;
    }

    public void record(AuditEvent event) {
        Map<String, Object> sanitizedDetails = sanitizeDetails(event.details());
        auditLog.info("AUDIT: type={} restaurant={} user={} entity={}:{} details={}",
                event.eventType(),
                event.restaurantId(),
                event.userId(),
                event.entityType(),
                event.entityId(),
                sanitizedDetails);

        try {
            persist(event, sanitizedDetails);
        } catch (RuntimeException ex) {
            // Best-effort: never fail the main transaction due to audit persistence.
            log.warn("Failed to persist audit event type={} restaurant={} entity={}:{}",
                    event.eventType(), event.restaurantId(), event.entityType(), event.entityId(), ex);
        }

        try {
            elasticsearchAuditEventPublisher.publish(event, sanitizedDetails);
        } catch (RuntimeException ex) {
            log.warn("Failed to publish audit event to Elasticsearch type={} restaurant={} entity={}:{}",
                    event.eventType(), event.restaurantId(), event.entityType(), event.entityId(), ex);
        }
    }

    public void record(String eventType, Long restaurantId, Long userId,
                       Long entityId, String entityType, Map<String, Object> details) {
        record(AuditEvent.create(eventType, restaurantId, userId, entityId, entityType, details));
    }

    public void recordReservationEvent(String eventType, Long restaurantId, Long userId,
                                        Long reservationId, Map<String, Object> details) {
        record(eventType, restaurantId, userId, reservationId, "RESERVATION", details);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    protected void persist(AuditEvent event, Map<String, Object> sanitizedDetails) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("entityType", event.entityType());
        payload.put("entityId", event.entityId());
        payload.put("details", sanitizedDetails);

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            json = "{\"error\":\"payload_serialization_failed\"}";
        }

        Long actorUserId = normalizeActorUserId(event.userId());
        AuditEventEntity entity = new AuditEventEntity(
                event.restaurantId(),
                actorUserId,
                event.eventType(),
                json
        );
        auditEventRepository.save(entity);
    }

    private Map<String, Object> sanitizeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return Map.of();
        }

        Map<String, Object> sanitized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : details.entrySet()) {
            if (entry == null) {
                continue;
            }
            String key = entry.getKey();
            if (key == null) {
                continue;
            }
            String keyLower = key.toLowerCase();
            Object value = entry.getValue();

            if (isRedactedKey(keyLower)) {
                sanitized.put(key, "[REDACTED]");
                continue;
            }
            if (keyLower.contains("email")) {
                sanitized.put(key, maskEmail(Objects.toString(value, null)));
                continue;
            }
            if (keyLower.contains("phone")) {
                sanitized.put(key, maskPhone(Objects.toString(value, null)));
                continue;
            }
            if (value instanceof Map<?, ?> mapValue) {
                sanitized.put(key, sanitizeDetails(castMap(mapValue)));
            } else if (value instanceof List<?> listValue) {
                sanitized.put(key, sanitizeList(listValue));
            } else {
                sanitized.put(key, value);
            }
        }
        return sanitized;
    }

    private boolean isRedactedKey(String keyLower) {
        return keyLower.contains("notes")
                || keyLower.contains("guestname")
                || keyLower.contains("password")
                || keyLower.contains("secret")
                || keyLower.contains("token")
                || keyLower.contains("authorization")
                || keyLower.contains("cookie");
    }

    private Map<String, Object> castMap(Map<?, ?> mapValue) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : mapValue.entrySet()) {
            if (entry.getKey() != null) {
                result.put(entry.getKey().toString(), entry.getValue());
            }
        }
        return result;
    }

    private List<Object> sanitizeList(List<?> list) {
        return list.stream()
                .map(item -> {
                    if (item instanceof Map<?, ?> mapValue) {
                        return sanitizeDetails(castMap(mapValue));
                    }
                    return item;
                })
                .toList();
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "[REDACTED]";
        }
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        String maskedLocal = local.length() <= 1 ? "*" : local.charAt(0) + "***";
        return maskedLocal + "@" + domain;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "[REDACTED]";
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 4) {
            return "***" + digits;
        }
        return "***" + digits.substring(digits.length() - 4);
    }

    private Long normalizeActorUserId(Long userId) {
        if (userId == null || userId <= 0) {
            return null;
        }
        return userId;
    }
}
