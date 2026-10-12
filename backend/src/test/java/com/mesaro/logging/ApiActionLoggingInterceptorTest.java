package com.mesaro.logging;

import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.config.RequestCorrelationFilter;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantContext;
import com.mesaro.security.RestaurantContextHolder;
import com.mesaro.security.RestaurantRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class ApiActionLoggingInterceptorTest {

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        RestaurantContextHolder.clear();
    }

    @Test
    void afterCompletion_publishesApiActionEvent() throws Exception {
        AtomicReference<ApiActionEvent> published = new AtomicReference<>();
        ApiActionEventPublisher publisher = published::set;
        MockEnvironment environment = new MockEnvironment().withProperty("spring.profiles.active", "dev");
        ApiActionLoggingInterceptor interceptor = new ApiActionLoggingInterceptor(publisher, environment);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/reservations");
        request.setRemoteAddr("127.0.0.1");
        request.setAttribute(RequestCorrelationFilter.CORRELATION_ID_REQUEST_ATTRIBUTE, "corr-123");
        request.setAttribute(RequestCorrelationFilter.REQUEST_ID_REQUEST_ATTRIBUTE, "req-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(200);

        AuthPrincipal principal = new AuthPrincipal(
                42L,
                "owner@example.com",
                List.of(new AuthRestaurantSummary(5L, RestaurantRole.OWNER)),
                List.of()
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of())
        );
        RestaurantContextHolder.set(new RestaurantContext(5L, RestaurantRole.OWNER));

        HandlerMethod handlerMethod = new HandlerMethod(new TestController(), TestController.class.getMethod("endpoint"));
        interceptor.preHandle(request, response, handlerMethod);
        interceptor.afterCompletion(request, response, handlerMethod, null);

        ApiActionEvent event = published.get();
        assertThat(event).isNotNull();
        assertThat(event.action()).isEqualTo("TestController.endpoint");
        assertThat(event.method()).isEqualTo("GET");
        assertThat(event.path()).isEqualTo("/api/admin/reservations");
        assertThat(event.status()).isEqualTo(200);
        assertThat(event.success()).isTrue();
        assertThat(event.userId()).isEqualTo(42L);
        assertThat(event.restaurantId()).isEqualTo(5L);
        assertThat(event.restaurantRole()).isEqualTo("OWNER");
        assertThat(event.correlationId()).isEqualTo("corr-123");
        assertThat(event.requestId()).isEqualTo("req-123");
        assertThat(event.environment()).isEqualTo("dev");
    }

    @Test
    void afterCompletion_redactsHoldTokenFromPath() throws Exception {
        AtomicReference<ApiActionEvent> published = new AtomicReference<>();
        ApiActionEventPublisher publisher = published::set;
        MockEnvironment environment = new MockEnvironment().withProperty("spring.profiles.active", "dev");
        ApiActionLoggingInterceptor interceptor = new ApiActionLoggingInterceptor(publisher, environment);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/holds/secret-token-value/confirm");
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(200);

        HandlerMethod handlerMethod = new HandlerMethod(new TestController(), TestController.class.getMethod("endpoint"));
        interceptor.preHandle(request, response, handlerMethod);
        interceptor.afterCompletion(request, response, handlerMethod, null);

        ApiActionEvent event = published.get();
        assertThat(event).isNotNull();
        assertThat(event.path()).isEqualTo("/api/holds/[REDACTED]/confirm");
    }

    private static class TestController {
        public void endpoint() {
            // no-op
        }
    }
}
