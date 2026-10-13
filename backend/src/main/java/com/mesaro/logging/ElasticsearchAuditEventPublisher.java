package com.mesaro.logging;

import com.mesaro.audit.AuditEvent;
import com.mesaro.config.AppProperties;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Publishes sanitized domain audit events to Elasticsearch for Kibana.
 */
@Component
public class ElasticsearchAuditEventPublisher {

    private final ElasticsearchDocumentIndexer indexer;
    private final AppProperties appProperties;
    private final Environment environment;

    public ElasticsearchAuditEventPublisher(
            ElasticsearchDocumentIndexer indexer,
            AppProperties appProperties,
            Environment environment) {
        this.indexer = indexer;
        this.appProperties = appProperties;
        this.environment = environment;
    }

    public void publish(AuditEvent event, Map<String, Object> sanitizedDetails) {
        Instant timestamp = event.timestamp() != null ? event.timestamp() : Instant.now();

        Map<String, Object> eventFields = new LinkedHashMap<>();
        eventFields.put("dataset", "mesaro.audit");
        eventFields.put("action", event.eventType());

        Map<String, Object> service = new LinkedHashMap<>();
        service.put("name", "mesaro-api");
        service.put("environment", resolveEnvironment());

        Map<String, Object> restaurant = new LinkedHashMap<>();
        restaurant.put("id", event.restaurantId());

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", event.userId());

        Map<String, Object> entity = new LinkedHashMap<>();
        entity.put("type", event.entityType());
        entity.put("id", event.entityId());

        Map<String, Object> audit = new LinkedHashMap<>();
        audit.put("details", sanitizedDetails == null ? Map.of() : sanitizedDetails);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("@timestamp", timestamp);
        payload.put("event", eventFields);
        payload.put("service", service);
        payload.put("restaurant", restaurant);
        payload.put("user", user);
        payload.put("entity", entity);
        payload.put("audit", audit);

        indexer.indexAsync(appProperties.getLogging().getElasticsearch().getAuditIndex(), timestamp, payload);
    }

    private String resolveEnvironment() {
        String[] activeProfiles = environment.getActiveProfiles();
        if (activeProfiles.length == 0) {
            return "default";
        }
        return activeProfiles[0];
    }
}
