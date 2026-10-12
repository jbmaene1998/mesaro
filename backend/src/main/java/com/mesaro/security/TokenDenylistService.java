package com.mesaro.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;

@Service
public class TokenDenylistService {

    private static final Logger log = LoggerFactory.getLogger(TokenDenylistService.class);
    private static final String KEY_PREFIX = "token_deny:user:";

    private final RedisTemplate<String, Object> redisTemplate;
    private final long accessTokenTtlSeconds;

    public TokenDenylistService(ObjectProvider<RedisTemplate<String, Object>> redisTemplateProvider,
                                @Value("${app.security.jwt.access-token-ttl-minutes:15}") long accessTokenTtlMinutes) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
        this.accessTokenTtlSeconds = Math.max(60L, accessTokenTtlMinutes * 60L);
    }

    public void denyUser(Long userId) {
        if (redisTemplate == null) {
            return;
        }
        redisTemplate.opsForValue().set(keyFor(userId), "1", Duration.ofSeconds(accessTokenTtlSeconds));
    }

    public boolean isDenied(Long userId) {
        if (redisTemplate == null) {
            return false;
        }
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(keyFor(userId)));
        } catch (RedisConnectionFailureException ex) {
            // Fail-open to preserve API availability when Redis is degraded.
            log.warn("Redis unavailable for token denylist check; allowing request");
            return false;
        }
    }

    private String keyFor(Long userId) {
        return KEY_PREFIX + userId;
    }
}
