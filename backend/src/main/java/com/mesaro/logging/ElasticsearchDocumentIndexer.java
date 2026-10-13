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
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Shared best-effort Elasticsearch indexer for observability documents.
 * Failures are logged and never thrown to callers.
 */
@Component
public class ElasticsearchDocumentIndexer {

    private static final Logger log = LoggerFactory.getLogger(ElasticsearchDocumentIndexer.class);
    private static final DateTimeFormatter DAILY_SUFFIX =
            DateTimeFormatter.ofPattern("yyyy.MM.dd").withZone(ZoneOffset.UTC);

    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;
    private final String elasticsearchUris;
    private final String elasticsearchUsername;
    private final String elasticsearchPassword;
    private final ExecutorService executor;
    private final HttpClient httpClient;

    public ElasticsearchDocumentIndexer(
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
            Thread thread = new Thread(r, "mesaro-es-indexer");
            thread.setDaemon(true);
            return thread;
        });
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(appProperties.getLogging().getElasticsearch().getConnectTimeoutMs()))
                .build();
    }

    public boolean isEnabled() {
        return appProperties.getLogging().getElasticsearch().isEnabled() && !elasticsearchUris.isBlank();
    }

    public String dailyIndex(String indexBase, Instant timestamp) {
        Instant when = timestamp != null ? timestamp : Instant.now();
        return indexBase + "-" + DAILY_SUFFIX.format(when);
    }

    public void indexAsync(String indexBase, Instant timestamp, Map<String, Object> document) {
        if (!isEnabled()) {
            return;
        }
        executor.execute(() -> index(indexBase, timestamp, document));
    }

    void index(String indexBase, Instant timestamp, Map<String, Object> document) {
        try {
            String baseUri = elasticsearchUris.split(",")[0].trim();
            String index = dailyIndex(indexBase, timestamp);
            URI target = URI.create(baseUri).resolve("/" + index + "/_doc");
            String body = objectMapper.writeValueAsString(document);

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
                log.warn("Elasticsearch indexing failed for index={} status={}", index, response.statusCode());
            }
        } catch (Exception ex) {
            log.warn("Failed to publish document to Elasticsearch: {}", ex.getMessage());
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }
}
