package com.mesaro.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter that adds a correlation ID to each request for distributed tracing.
 *
 * The correlation ID is:
 * - Read from X-Correlation-ID header if provided (for distributed tracing)
 * - Generated as a new UUID if not provided
 * - Added to MDC for logging
 * - Returned in response header
 *
 * This enables tracking requests across services and in log aggregation systems.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String CORRELATION_ID_MDC_KEY = "correlationId";
    public static final String REQUEST_ID_MDC_KEY = "requestId";
    public static final String CORRELATION_ID_REQUEST_ATTRIBUTE = "mesaro.correlationId";
    public static final String REQUEST_ID_REQUEST_ATTRIBUTE = "mesaro.requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // Get or generate correlation ID
            String correlationId = request.getHeader(CORRELATION_ID_HEADER);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = generateId();
            }

            // Generate unique request ID for this specific request
            String requestId = generateId();

            // Add to MDC for logging
            MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
            MDC.put(REQUEST_ID_MDC_KEY, requestId);

            // Add to request attributes for downstream access (e.g., interceptors)
            request.setAttribute(CORRELATION_ID_REQUEST_ATTRIBUTE, correlationId);
            request.setAttribute(REQUEST_ID_REQUEST_ATTRIBUTE, requestId);

            // Add to response header for client tracing
            response.setHeader(CORRELATION_ID_HEADER, correlationId);

            filterChain.doFilter(request, response);
        } finally {
            // Clean up MDC
            MDC.remove(CORRELATION_ID_MDC_KEY);
            MDC.remove(REQUEST_ID_MDC_KEY);
        }
    }

    private String generateId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
