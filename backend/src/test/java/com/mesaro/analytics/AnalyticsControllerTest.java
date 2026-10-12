package com.mesaro.analytics;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsControllerTest {

    private final AnalyticsController controller = new AnalyticsController();

    @Test
    @SuppressWarnings("unchecked")
    void sanitizeProperties_filtersSensitiveKeys() {
        Map<String, Object> input = Map.of(
                "pathname", "/r/demo/reservation/ABC",
                "cancelToken", "secret",
                "search", "?cancelToken=secret",
                "email", "user@example.com",
                "safe", true
        );

        Map<String, Object> sanitized = ReflectionTestUtils.invokeMethod(controller, "sanitizeProperties", input);

        assertThat(sanitized).containsEntry("pathname", "/r/demo/reservation/ABC");
        assertThat(sanitized).containsEntry("safe", true);
        assertThat(sanitized).doesNotContainKeys("cancelToken", "search", "email");
    }

    @Test
    void captureEvent_acceptsSanitizedPayload() {
        AnalyticsEventRequest request = new AnalyticsEventRequest(
                "page_view",
                "reservation",
                "/r/demo/reservation/ABC",
                Map.of("safe", true, "hold_token", "secret"),
                Instant.now()
        );

        var response = controller.captureEvent(request);
        assertThat(response.success()).isTrue();
    }
}
