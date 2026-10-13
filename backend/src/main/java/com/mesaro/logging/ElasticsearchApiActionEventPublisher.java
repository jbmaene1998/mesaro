package com.mesaro.logging;

import com.mesaro.config.AppProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class ElasticsearchApiActionEventPublisher implements ApiActionEventPublisher {

    private final ElasticsearchDocumentIndexer indexer;
    private final AppProperties appProperties;

    public ElasticsearchApiActionEventPublisher(
            ElasticsearchDocumentIndexer indexer,
            AppProperties appProperties) {
        this.indexer = indexer;
        this.appProperties = appProperties;
    }

    @Override
    public void publish(ApiActionEvent event) {
        Instant timestamp = event.timestamp() != null ? event.timestamp() : Instant.now();

        Map<String, Object> httpRequest = new LinkedHashMap<>();
        httpRequest.put("method", event.method());

        Map<String, Object> httpResponse = new LinkedHashMap<>();
        httpResponse.put("status_code", event.status());

        Map<String, Object> http = new LinkedHashMap<>();
        http.put("request", httpRequest);
        http.put("response", httpResponse);

        Map<String, Object> url = new LinkedHashMap<>();
        url.put("path", event.path());

        Map<String, Object> eventFields = new LinkedHashMap<>();
        eventFields.put("dataset", "mesaro.api.actions");
        eventFields.put("action", event.action());
        eventFields.put("outcome", event.success() ? "success" : "failure");
        eventFields.put("duration_ms", event.durationMs());

        Map<String, Object> service = new LinkedHashMap<>();
        service.put("name", "mesaro-api");
        service.put("environment", event.environment());

        Map<String, Object> trace = new LinkedHashMap<>();
        trace.put("correlation_id", event.correlationId());
        trace.put("request_id", event.requestId());

        Map<String, Object> client = new LinkedHashMap<>();
        client.put("ip", event.clientIp());

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", event.userId());

        Map<String, Object> restaurant = new LinkedHashMap<>();
        restaurant.put("id", event.restaurantId());
        restaurant.put("role", event.restaurantRole());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("@timestamp", timestamp);
        payload.put("event", eventFields);
        payload.put("service", service);
        payload.put("http", http);
        payload.put("url", url);
        payload.put("trace", trace);
        payload.put("client", client);
        payload.put("user", user);
        payload.put("restaurant", restaurant);

        indexer.indexAsync(appProperties.getLogging().getElasticsearch().getIndex(), timestamp, payload);
    }
}
