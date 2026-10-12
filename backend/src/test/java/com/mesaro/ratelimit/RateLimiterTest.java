package com.mesaro.ratelimit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterTest {

    private RateLimitProperties properties;
    private RateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        properties = new RateLimitProperties();
        properties.setEnabled(true);
        properties.setDefaultRequests(10);
        properties.setDefaultWindowSeconds(60);

        // Configure specific endpoint limits
        RateLimitProperties.EndpointLimit holdsLimit = new RateLimitProperties.EndpointLimit(5, 60);
        properties.getEndpoints().put("holds", holdsLimit);

        rateLimiter = new RateLimiter(properties);
    }

    @Test
    void shouldAllowRequestsWithinLimit() {
        RateLimiter.RateLimitResult result = rateLimiter.checkLimit("client1", "default");

        assertTrue(result.allowed());
        assertEquals(9, result.remainingTokens());
        assertEquals(10, result.limitMax());
    }

    @Test
    void shouldDenyRequestsExceedingLimit() {
        String clientKey = "client2";

        // Exhaust the limit
        for (int i = 0; i < 10; i++) {
            RateLimiter.RateLimitResult result = rateLimiter.checkLimit(clientKey, "default");
            assertTrue(result.allowed(), "Request " + (i + 1) + " should be allowed");
        }

        // 11th request should be denied
        RateLimiter.RateLimitResult result = rateLimiter.checkLimit(clientKey, "default");
        assertFalse(result.allowed());
        assertEquals(0, result.remainingTokens());
        assertEquals(10, result.limitMax());
        assertTrue(result.retryAfterSeconds() > 0);
    }

    @Test
    void shouldUseEndpointSpecificLimits() {
        String clientKey = "client3";

        // Holds has a limit of 5
        for (int i = 0; i < 5; i++) {
            RateLimiter.RateLimitResult result = rateLimiter.checkLimit(clientKey, "holds");
            assertTrue(result.allowed());
        }

        // 6th request to holds should be denied
        RateLimiter.RateLimitResult result = rateLimiter.checkLimit(clientKey, "holds");
        assertFalse(result.allowed());
    }

    @Test
    void shouldTrackDifferentClientsSeparately() {
        // Exhaust limit for client A
        for (int i = 0; i < 10; i++) {
            rateLimiter.checkLimit("clientA", "default");
        }

        // Client B should still have full limit
        RateLimiter.RateLimitResult resultB = rateLimiter.checkLimit("clientB", "default");
        assertTrue(resultB.allowed());
        assertEquals(9, resultB.remainingTokens());

        // Client A should be denied
        RateLimiter.RateLimitResult resultA = rateLimiter.checkLimit("clientA", "default");
        assertFalse(resultA.allowed());
    }

    @Test
    void shouldTrackDifferentEndpointsSeparately() {
        String clientKey = "client4";

        // Exhaust holds limit (5)
        for (int i = 0; i < 5; i++) {
            rateLimiter.checkLimit(clientKey, "holds");
        }

        // Default endpoint should still work
        RateLimiter.RateLimitResult result = rateLimiter.checkLimit(clientKey, "default");
        assertTrue(result.allowed());

        // Holds should be denied
        RateLimiter.RateLimitResult holdsResult = rateLimiter.checkLimit(clientKey, "holds");
        assertFalse(holdsResult.allowed());
    }

    @Test
    void shouldAllowAllRequestsWhenDisabled() {
        properties.setEnabled(false);

        // Should allow unlimited requests
        for (int i = 0; i < 100; i++) {
            RateLimiter.RateLimitResult result = rateLimiter.checkLimit("client", "default");
            assertTrue(result.allowed());
        }
    }

    @Test
    void shouldClearAllBuckets() {
        // Exhaust limit
        for (int i = 0; i < 10; i++) {
            rateLimiter.checkLimit("client", "default");
        }
        assertFalse(rateLimiter.checkLimit("client", "default").allowed());

        // Clear
        rateLimiter.clearAll();

        // Should have full limit again
        RateLimiter.RateLimitResult result = rateLimiter.checkLimit("client", "default");
        assertTrue(result.allowed());
        assertEquals(9, result.remainingTokens());
    }
}
