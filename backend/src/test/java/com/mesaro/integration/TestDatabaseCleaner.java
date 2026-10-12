package com.mesaro.integration;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.stream.Collectors;

public class TestDatabaseCleaner {

    private final JdbcTemplate jdbcTemplate;

    public TestDatabaseCleaner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void clean() {
        List<String> tableNames = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables " +
                        "WHERE schemaname = 'public' " +
                        "AND tablename <> 'flyway_schema_history'",
                String.class);

        if (tableNames.isEmpty()) {
            return;
        }

        String tables = tableNames.stream()
                .map(name -> "\"" + name + "\"")
                .collect(Collectors.joining(", "));

        jdbcTemplate.execute("TRUNCATE " + tables + " RESTART IDENTITY CASCADE");
    }
}
