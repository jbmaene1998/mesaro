package com.mesaro.ratelimit;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class TokenBucketTest {

    @Test
    void shouldAllowRequestsUpToLimit() {
        TokenBucket bucket = new TokenBucket(5, 60);

        // Should allow 5 requests
        for (int i = 0; i < 5; i++) {
            assertTrue(bucket.tryConsume(), "Request " + (i + 1) + " should be allowed");
        }

        // 6th request should be denied
        assertFalse(bucket.tryConsume(), "6th request should be denied");
    }

    @Test
    void shouldRefillTokensOverTime() throws InterruptedException {
        // 10 tokens per 1 second = 1 token every 100ms
        TokenBucket bucket = new TokenBucket(10, 1);

        // Consume all tokens
        for (int i = 0; i < 10; i++) {
            assertTrue(bucket.tryConsume());
        }
        assertFalse(bucket.tryConsume());

        // Wait for tokens to refill (at least 1)
        Thread.sleep(150);

        // Should have at least 1 token now
        assertTrue(bucket.tryConsume(), "Should have refilled at least 1 token");
    }

    @Test
    void shouldReturnCorrectAvailableTokens() {
        TokenBucket bucket = new TokenBucket(10, 60);

        assertEquals(10, bucket.getAvailableTokens());

        bucket.tryConsume();
        assertEquals(9, bucket.getAvailableTokens());

        bucket.tryConsume();
        bucket.tryConsume();
        assertEquals(7, bucket.getAvailableTokens());
    }

    @Test
    void shouldBeThreadSafe() throws InterruptedException {
        TokenBucket bucket = new TokenBucket(100, 60);
        int threadCount = 10;
        int requestsPerThread = 20;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        if (bucket.tryConsume()) {
                            successCount.incrementAndGet();
                        }
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        // Exactly 100 requests should succeed (the bucket capacity)
        assertEquals(100, successCount.get(), "Exactly 100 requests should succeed");
    }

    @Test
    void shouldNotAllowNegativeTokens() {
        TokenBucket bucket = new TokenBucket(3, 60);

        // Consume all
        assertTrue(bucket.tryConsume());
        assertTrue(bucket.tryConsume());
        assertTrue(bucket.tryConsume());

        // Try to consume more
        assertFalse(bucket.tryConsume());
        assertFalse(bucket.tryConsume());

        // Available should not go negative
        assertEquals(0, bucket.getAvailableTokens());
    }
}
