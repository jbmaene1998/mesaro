package com.mesaro.logging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.mesaro.config.AppProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class ElasticsearchApiActionEventPublisherTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void publish_doesNotSendUserEmailField() throws Exception {
        AtomicReference<String> bodyRef = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/mesaro-api-actions/_doc", exchange -> {
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

        ElasticsearchApiActionEventPublisher publisher = new ElasticsearchApiActionEventPublisher(
                new ObjectMapper().findAndRegisterModules(),
                properties,
                uri,
                "",
                ""
        );

        ApiActionEvent event = new ApiActionEvent(
                Instant.now(),
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

        String payload = bodyRef.get();
        assertThat(payload).contains("\"user.id\":42");
        assertThat(payload).doesNotContain("user.email");
    }
}
