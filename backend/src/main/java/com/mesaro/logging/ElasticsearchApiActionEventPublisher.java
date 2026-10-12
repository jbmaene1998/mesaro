package com.mesaro.logging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.config.AppProperties;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
public class ElasticsearchApiActionEventPublisher implements ApiActionEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ElasticsearchApiActionEventPublisher.class);

    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;
    private final String elasticsearchUris;
    private final String elasticsearchUsername;
    private final String elasticsearchPassword;
    private final ExecutorService executor;
    private final HttpClient httpClient;

    public ElasticsearchApiActionEventPublisher(
            ObjectMapper objectMapper,
            AppProperties appProperties,
            @Value("${spring.elasticsearch.uris:}") String elasticsearchUris,
            @Value("${spring.elasticsearch.username:}") String elasticsearchUsername,
            @Value("${spring.elasticsearch.password:}") String elasticsearchPassword) {
        this.objectMapper = objectMapper;
        this.appProperties = appProperties;
        this.elasticsearchUris = elasticsearchUris == null ? "" : elasticsearchUris.trim();
        this.elasticsearchUsername = elasticsearchUsername == null ? "" : elasticsearchUsername.trim();
        this.elasticsearchPassword = elasticsearchPassword == null ? "" : elasticsearchPassword.trim();
        this.executor = Executors.newSingleThreadExecutor(r -> {
            Thread thread = new Thread(r, "mesaro-es-action-logger");
            thread.setDaemon(true);
            return thread;
        });
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(appProperties.getLogging().getElasticsearch().getConnectTimeoutMs()))
                .build();
    }

    @Override
    public void publish(ApiActionEvent event) {
        if (!appProperties.getLogging().getElasticsearch().isEnabled()) {
            return;
        }
        if (elasticsearchUris.isBlank()) {
            return;
        }
        executor.execute(() -> sendEvent(event));
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }

    private void sendEvent(ApiActionEvent event) {
        try {
            String baseUri = elasticsearchUris.split(",")[0].trim();
            String index = appProperties.getLogging().getElasticsearch().getIndex();
            String targetPath = "/" + index + "/_doc";
            URI target = URI.create(baseUri).resolve(targetPath);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("@timestamp", event.timestamp() != null ? event.timestamp() : Instant.now());
            payload.put("event.dataset", "mesaro.api.actions");
            payload.put("event.action", event.action());
            payload.put("event.outcome", event.success() ? "success" : "failure");
            payload.put("service.name", "mesaro-api");
            payload.put("service.environment", event.environment());
            payload.put("http.request.method", event.method());
            payload.put("url.path", event.path());
            payload.put("http.response.status_code", event.status());
            payload.put("event.duration_ms", event.durationMs());
            payload.put("trace.correlation_id", event.correlationId());
            payload.put("trace.request_id", event.requestId());
            payload.put("client.ip", event.clientIp());
            payload.put("user.id", event.userId());
            payload.put("restaurant.id", event.restaurantId());
            payload.put("restaurant.role", event.restaurantRole());

            String body = objectMapper.writeValueAsString(payload);
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(target)
                    .timeout(Duration.ofMillis(appProperties.getLogging().getElasticsearch().getReadTimeoutMs()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body));

            if (!elasticsearchUsername.isBlank()) {
                String auth = elasticsearchUsername + ":" + elasticsearchPassword;
                String encoded = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
                requestBuilder.header("Authorization", "Basic " + encoded);
            }

            HttpResponse<String> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Elasticsearch action log indexing failed with status {}", response.statusCode());
            }
        } catch (Exception ex) {
            log.warn("Failed to publish API action event to Elasticsearch: {}", ex.getMessage());
        }
    }
}
