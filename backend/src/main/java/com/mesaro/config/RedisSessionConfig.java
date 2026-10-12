package com.mesaro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;

/**
 * Redis and Spring Session configuration.
 *
 * This configuration is only active when session store type is set to 'redis'.
 * For local development without Redis, set SESSION_STORE_TYPE=none.
 *
 * Note: The application uses JWT for authentication (stateless), so HTTP sessions
 * are not used for auth. Redis sessions can be used for other purposes like:
 * - Storing user preferences
 * - Shopping cart (if applicable)
 * - Other transient data that benefits from distributed storage
 *
 * The SecurityConfig uses SessionCreationPolicy.STATELESS, so Spring Security
 * will not create sessions. This Redis session store is available for application
 * code that explicitly needs session storage.
 */
@Configuration
@ConditionalOnProperty(name = "spring.session.store-type", havingValue = "redis")
@EnableRedisHttpSession(
        redisNamespace = "${spring.session.redis.namespace:mesaro:session}",
        maxInactiveIntervalInSeconds = 1800  // 30 minutes
)
public class RedisSessionConfig {

    private static final Logger log = LoggerFactory.getLogger(RedisSessionConfig.class);

    /**
     * Configure RedisTemplate with JSON serialization for better debugging.
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();

        log.info("Redis session store configured with namespace: mesaro:session");
        return template;
    }
}
