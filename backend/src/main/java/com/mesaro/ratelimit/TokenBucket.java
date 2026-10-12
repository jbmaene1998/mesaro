package com.mesaro.ratelimit;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe token bucket implementation for rate limiting.
 *
 * Uses a sliding window approach where tokens are refilled based on elapsed time.
 * This provides smooth rate limiting without sudden resets.
 */
public class TokenBucket {

    private final int maxTokens;
    private final long refillIntervalNanos;
    private final AtomicLong availableTokens;
    private final AtomicLong lastRefillNanos;

    /**
     * Create a token bucket.
     *
     * @param maxTokens     Maximum tokens (requests) allowed in the window
     * @param windowSeconds Duration of the window in seconds
     */
    public TokenBucket(int maxTokens, int windowSeconds) {
        this.maxTokens = maxTokens;
        this.refillIntervalNanos = (windowSeconds * 1_000_000_000L) / maxTokens;
        this.availableTokens = new AtomicLong(maxTokens);
        this.lastRefillNanos = new AtomicLong(System.nanoTime());
    }

    /**
     * Try to consume a token.
     *
     * @return true if a token was consumed, false if rate limit exceeded
     */
    public boolean tryConsume() {
        refill();

        long current;
        do {
            current = availableTokens.get();
            if (current <= 0) {
                return false;
            }
        } while (!availableTokens.compareAndSet(current, current - 1));

        return true;
    }

    /**
     * Get the number of tokens currently available.
     */
    public long getAvailableTokens() {
        refill();
        return Math.max(0, availableTokens.get());
    }

    private void refill() {
        long now = System.nanoTime();
        long lastRefill = lastRefillNanos.get();
        long elapsed = now - lastRefill;

        if (elapsed <= 0) {
            return;
        }

        long tokensToAdd = elapsed / refillIntervalNanos;
        if (tokensToAdd > 0) {
            // Attempt to update last refill time
            if (lastRefillNanos.compareAndSet(lastRefill, lastRefill + tokensToAdd * refillIntervalNanos)) {
                // Successfully claimed the refill, add tokens
                long current;
                long newValue;
                do {
                    current = availableTokens.get();
                    newValue = Math.min(maxTokens, current + tokensToAdd);
                } while (!availableTokens.compareAndSet(current, newValue));
            }
        }
    }
}
