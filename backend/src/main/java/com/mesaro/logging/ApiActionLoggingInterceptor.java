package com.mesaro.logging;

import com.mesaro.config.RequestCorrelationFilter;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantContext;
import com.mesaro.security.RestaurantContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;
import java.util.Optional;

@Component
public class ApiActionLoggingInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ApiActionLoggingInterceptor.class);
    private static final String START_NANOS_ATTR = "mesaro.apiAction.startNanos";

    private final ApiActionEventPublisher eventPublisher;
    private final Environment environment;

    public ApiActionLoggingInterceptor(ApiActionEventPublisher eventPublisher, Environment environment) {
        this.eventPublisher = eventPublisher;
        this.environment = environment;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_NANOS_ATTR, System.nanoTime());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/api/")) {
            return;
        }
        String sanitizedPath = sanitizePath(path);

        long startedNanos = Optional.ofNullable(request.getAttribute(START_NANOS_ATTR))
                .filter(Long.class::isInstance)
                .map(Long.class::cast)
                .orElse(System.nanoTime());
        long durationMs = Math.max(0L, (System.nanoTime() - startedNanos) / 1_000_000L);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = null;
        String userEmail = null;
        if (authentication != null && authentication.getPrincipal() instanceof AuthPrincipal principal) {
            userId = principal.getUserId();
            userEmail = principal.getEmail();
        }

        Optional<RestaurantContext> restaurantContext = RestaurantContextHolder.get();
        Long restaurantId = restaurantContext.map(RestaurantContext::restaurantId).orElse(null);
        String restaurantRole = restaurantContext.map(ctx -> ctx.role() == null ? null : ctx.role().name()).orElse(null);

        String action = resolveAction(handler, request.getMethod(), sanitizedPath);
        int status = response.getStatus();
        boolean success = status < 400;
        String correlationId = readRequestAttribute(request, RequestCorrelationFilter.CORRELATION_ID_REQUEST_ATTRIBUTE);
        String requestId = readRequestAttribute(request, RequestCorrelationFilter.REQUEST_ID_REQUEST_ATTRIBUTE);
        String environmentName = resolveEnvironment();
        String clientIp = resolveClientIp(request);

        ApiActionEvent event = new ApiActionEvent(
                Instant.now(),
                environmentName,
                action,
                request.getMethod(),
                sanitizedPath,
                status,
                durationMs,
                success,
                correlationId,
                requestId,
                clientIp,
                userId,
                userEmail,
                restaurantId,
                restaurantRole
        );

        eventPublisher.publish(event);

        log.info("api_action action={} method={} path={} status={} durationMs={} userId={} restaurantId={} correlationId={}",
                action, request.getMethod(), sanitizedPath, status, durationMs, userId, restaurantId, correlationId);
    }

    private String resolveAction(Object handler, String method, String path) {
        if (handler instanceof HandlerMethod handlerMethod) {
            return handlerMethod.getBeanType().getSimpleName() + "." + handlerMethod.getMethod().getName();
        }
        return method + " " + path;
    }

    private String readRequestAttribute(HttpServletRequest request, String key) {
        Object value = request.getAttribute(key);
        return value == null ? null : value.toString();
    }

    private String resolveEnvironment() {
        String[] activeProfiles = environment.getActiveProfiles();
        if (activeProfiles.length == 0) {
            return "default";
        }
        return activeProfiles[0];
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private String sanitizePath(String path) {
        if (path == null || path.isBlank()) {
            return path;
        }
        return path.replaceAll("(?i)(/api/holds/)[^/]+(/confirm)$", "$1[REDACTED]$2");
    }
}
