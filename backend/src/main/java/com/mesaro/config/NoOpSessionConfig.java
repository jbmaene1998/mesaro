package com.mesaro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

/**
 * Configuration active when Redis session store is disabled.
 *
 * Use this for local development without Redis by setting:
 * SESSION_STORE_TYPE=none
 *
 * In this mode, any session data will use the default in-memory servlet session
 * (not recommended for production with multiple instances).
 */
@Configuration
@ConditionalOnProperty(name = "spring.session.store-type", havingValue = "none", matchIfMissing = false)
public class NoOpSessionConfig {

    private static final Logger log = LoggerFactory.getLogger(NoOpSessionConfig.class);

    @PostConstruct
    void init() {
        log.warn("Redis session store is DISABLED. Using in-memory sessions. " +
                "This is not suitable for production deployments with multiple instances.");
    }
}
