package com.mesaro.integration;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

public abstract class IntegrationTestBase {
    private static final String DEFAULT_URL = "jdbc:postgresql://localhost:55432/mesaro";
    private static final String DEFAULT_USERNAME = "mesaro";
    private static final String DEFAULT_PASSWORD = "mesaro";

    @DynamicPropertySource
    static void registerDataSourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("mesaro.it.datasource.url", DEFAULT_URL));
        registry.add("spring.datasource.username", () -> System.getProperty("mesaro.it.datasource.username", DEFAULT_USERNAME));
        registry.add("spring.datasource.password", () -> System.getProperty("mesaro.it.datasource.password", DEFAULT_PASSWORD));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        new TestDatabaseCleaner(jdbcTemplate).clean();
    }
}
