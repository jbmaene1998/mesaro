package com.mesaro.ratelimit;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Configuration properties for rate limiting.
 *
 * Limits are defined per endpoint group with requests per window (in seconds).
 * Example config in application.yml:
 *
 * app:
 *   rate-limit:
 *     enabled: true
 *     default-requests: 100
 *     default-window-seconds: 60
 *     endpoints:
 *       availability:
 *         requests: 60
 *         window-seconds: 60
 *       holds:
 *         requests: 10
 *         window-seconds: 60
 */
@Component
@ConfigurationProperties(prefix = "app.rate-limit")
@Validated
public class RateLimitProperties {

    private boolean enabled = true;
    @Min(1)
    private int defaultRequests = 100;
    @Min(1)
    private int defaultWindowSeconds = 60;
    private boolean trustForwardedHeaders = false;
    private List<String> trustedProxies = new ArrayList<>();
    @Valid
    private Map<String, EndpointLimit> endpoints = new HashMap<>();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getDefaultRequests() {
        return defaultRequests;
    }

    public void setDefaultRequests(int defaultRequests) {
        this.defaultRequests = defaultRequests;
    }

    public int getDefaultWindowSeconds() {
        return defaultWindowSeconds;
    }

    public void setDefaultWindowSeconds(int defaultWindowSeconds) {
        this.defaultWindowSeconds = defaultWindowSeconds;
    }

    public Map<String, EndpointLimit> getEndpoints() {
        return endpoints;
    }

    public void setEndpoints(Map<String, EndpointLimit> endpoints) {
        this.endpoints = endpoints;
    }

    public boolean isTrustForwardedHeaders() {
        return trustForwardedHeaders;
    }

    public void setTrustForwardedHeaders(boolean trustForwardedHeaders) {
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

    public List<String> getTrustedProxies() {
        return trustedProxies;
    }

    public void setTrustedProxies(List<String> trustedProxies) {
        this.trustedProxies = trustedProxies != null ? trustedProxies : new ArrayList<>();
    }

    /**
     * Get the limit configuration for a specific endpoint group.
     * Falls back to default if not configured.
     */
    public EndpointLimit getLimitForGroup(String group) {
        return endpoints.getOrDefault(group, new EndpointLimit(defaultRequests, defaultWindowSeconds));
    }

    public static class EndpointLimit {
        @Min(1)
        private int requests;
        @Min(1)
        private int windowSeconds;

        public EndpointLimit() {
        }

        public EndpointLimit(int requests, int windowSeconds) {
            this.requests = requests;
            this.windowSeconds = windowSeconds;
        }

        public int getRequests() {
            return requests;
        }

        public void setRequests(int requests) {
            this.requests = requests;
        }

        public int getWindowSeconds() {
            return windowSeconds;
        }

        public void setWindowSeconds(int windowSeconds) {
            this.windowSeconds = windowSeconds;
        }
    }
}
