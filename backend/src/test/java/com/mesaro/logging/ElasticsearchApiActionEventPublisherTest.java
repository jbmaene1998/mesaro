package com.mesaro.logging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.config.AppProperties;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class ElasticsearchApiActionEventPublisherTest {

    private static final DateTimeFormatter DAILY =
            DateTimeFormatter.ofPattern("yyyy.MM.dd").withZone(ZoneOffset.UTC);

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void publish_sendsNestedEcsWithoutUserEmail() throws Exception {
        Instant timestamp = Instant.parse("2026-10-13T12:00:00Z");
        String expectedPath = "/mesaro-api-actions-" + DAILY.format(timestamp) + "/_doc";

        AtomicReference<String> bodyRef = new AtomicReference<>();
        AtomicReference<String> pathRef = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", exchange -> {
            pathRef.set(exchange.getRequestURI().getPath());
            bodyRef.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] ok = "{\"result\":\"created\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(201, ok.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(ok);
            }
            latch.countDown();
        });
        server.start();

        AppProperties properties = new AppProperties();
        properties.getLogging().getElasticsearch().setEnabled(true);
        properties.getLogging().getElasticsearch().setIndex("mesaro-api-actions");
        String uri = "http://localhost:" + server.getAddress().getPort();

        ElasticsearchDocumentIndexer indexer = new ElasticsearchDocumentIndexer(
                new ObjectMapper().findAndRegisterModules(),
                properties,
                uri,
                "",
                ""
        );
        ElasticsearchApiActionEventPublisher publisher =
                new ElasticsearchApiActionEventPublisher(indexer, properties);

        ApiActionEvent event = new ApiActionEvent(
                timestamp,
                "test",
                "Test.action",
                "GET",
                "/api/test",
                200,
                5,
                true,
                "corr-1",
                "req-1",
                "127.0.0.1",
                42L,
                "owner@example.com",
                9L,
                "OWNER"
        );

        publisher.publish(event);
        assertThat(latch.await(3, TimeUnit.SECONDS)).isTrue();

        assertThat(pathRef.get()).isEqualTo(expectedPath);

        JsonNode payload = new ObjectMapper().findAndRegisterModules().readTree(bodyRef.get());
        assertThat(payload.path("event").path("dataset").asText()).isEqualTo("mesaro.api.actions");
        assertThat(payload.path("http").path("request").path("method").asText()).isEqualTo("GET");
        assertThat(payload.path("user").path("id").asLong()).isEqualTo(42L);
        assertThat(payload.path("user").has("email")).isFalse();
        assertThat(bodyRef.get()).doesNotContain("owner@example.com");
    }
}
