package com.mesaro.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Distributed-first rate limiter.
 * Uses Redis sliding windows when available and falls back to in-memory token buckets.
 */
@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    private final RateLimitProperties properties;
    private final RedisTemplate<String, Object> redisTemplate;
    private final Map<String, BucketEntry> buckets = new ConcurrentHashMap<>();

    public RateLimiter(RateLimitProperties properties) {
        this(properties, null);
    }

    @Autowired
    public RateLimiter(
            RateLimitProperties properties,
            @Autowired(required = false) RedisTemplate<String, Object> redisTemplate) {
        this.properties = properties;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Check if a request is allowed for the given client and endpoint group.
     * Redis path is used when configured; otherwise an in-memory fallback is used.
     */
    public RateLimitResult checkLimit(String clientKey, String endpointGroup) {
        if (!properties.isEnabled()) {
            return RateLimitResult.ok();
        }

        if (redisTemplate != null) {
            return checkLimitWithRedis(clientKey, endpointGroup);
        }

        return checkLimitInMemory(clientKey, endpointGroup);
    }

    private RateLimitResult checkLimitWithRedis(String clientKey, String endpointGroup) {
        RateLimitProperties.EndpointLimit limit = properties.getLimitForGroup(endpointGroup);
        String key = "rl:" + endpointGroup + ":" + clientKey;
        long now = System.currentTimeMillis();
        long windowStart = now - (limit.getWindowSeconds() * 1000L);

        List<Object> results = redisTemplate.executePipelined((RedisCallback<Object>) conn -> {
            byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
            conn.zRemRangeByScore(keyBytes, 0, windowStart);
            conn.zAdd(keyBytes, now, (now + "-" + Thread.currentThread().getId() + "-" + UUID.randomUUID())
                    .getBytes(StandardCharsets.UTF_8));
            conn.zCard(keyBytes);
            conn.expire(keyBytes, limit.getWindowSeconds() + 1L);
            return null;
        });

        long count = extractLong(results, 2);
        boolean allowed = count <= limit.getRequests();
        long remaining = Math.max(0, limit.getRequests() - count);

        if (!allowed) {
            log.warn("Rate limit exceeded for client {} on endpoint group {}", clientKey, endpointGroup);
            return RateLimitResult.exceeded(limit.getRequests(), limit.getWindowSeconds());
        }
        return RateLimitResult.ok(remaining, limit.getRequests());
    }

    private long extractLong(List<Object> values, int index) {
        if (values == null || values.size() <= index || values.get(index) == null) {
            return 0L;
        }
        Object value = values.get(index);
        if (value instanceof Long l) {
            return l;
        }
        if (value instanceof Integer i) {
            return i.longValue();
        }
        return 0L;
    }

    private RateLimitResult checkLimitInMemory(String clientKey, String endpointGroup) {
        String bucketKey = clientKey + ":" + endpointGroup;
        RateLimitProperties.EndpointLimit limit = properties.getLimitForGroup(endpointGroup);

        BucketEntry entry = buckets.computeIfAbsent(bucketKey,
                ignored -> new BucketEntry(new TokenBucket(limit.getRequests(), limit.getWindowSeconds())));

        if (entry.bucket.tryConsume()) {
            return RateLimitResult.ok(entry.bucket.getAvailableTokens(), limit.getRequests());
        }

        log.warn("Rate limit exceeded for client {} on endpoint group {}", clientKey, endpointGroup);
        return RateLimitResult.exceeded(limit.getRequests(), limit.getWindowSeconds());
    }

    /**
     * Clear all limiter state (for testing).
     */
    public void clearAll() {
        buckets.clear();
        if (redisTemplate != null) {
            Set<String> keys = redisTemplate.keys("rl:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        }
    }

    private static class BucketEntry {
        final TokenBucket bucket;

        BucketEntry(TokenBucket bucket) {
            this.bucket = bucket;
        }
    }

    /**
     * Result of a rate limit check.
     */
    public record RateLimitResult(
            boolean allowed,
            long remainingTokens,
            int limitMax,
            int retryAfterSeconds
    ) {
        public static RateLimitResult ok() {
            return new RateLimitResult(true, -1, -1, 0);
        }

        public static RateLimitResult ok(long remaining, int max) {
            return new RateLimitResult(true, remaining, max, 0);
        }

        public static RateLimitResult exceeded(int max, int windowSeconds) {
            return new RateLimitResult(false, 0, max, windowSeconds);
        }
    }
}
