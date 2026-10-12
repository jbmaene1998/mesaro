package com.mesaro.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class OutboxService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public OutboxService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void enqueue(String aggregateType,
                        Long aggregateId,
                        String eventType,
                        Object payload,
                        String dedupKey) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            jdbcTemplate.update(
                    "INSERT INTO outbox_event(aggregate_type, aggregate_id, event_type, payload, dedup_key) " +
                            "VALUES (?, ?, ?, CAST(? AS jsonb), ?) " +
                            "ON CONFLICT (dedup_key) DO NOTHING",
                    aggregateType,
                    aggregateId,
                    eventType,
                    payloadJson,
                    dedupKey
            );
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Could not serialize outbox payload", ex);
        }
    }
}
