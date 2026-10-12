package com.mesaro.outbox;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.email.EmailSendLogService;
import com.mesaro.email.ReservationConfirmationEmailSender;
import com.mesaro.email.ReservationEmailData;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
public class OutboxWorker {

    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ReservationConfirmationEmailSender reservationConfirmationEmailSender;
    private final EmailSendLogService emailSendLogService;
    private final MeterRegistry meterRegistry;

    public OutboxWorker(JdbcTemplate jdbcTemplate,
                        ObjectMapper objectMapper,
                        ReservationConfirmationEmailSender reservationConfirmationEmailSender,
                        EmailSendLogService emailSendLogService,
                        MeterRegistry meterRegistry) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.reservationConfirmationEmailSender = reservationConfirmationEmailSender;
        this.emailSendLogService = emailSendLogService;
        this.meterRegistry = meterRegistry;
    }

    @Scheduled(fixedDelayString = "${app.outbox.interval-ms:5000}")
    @Transactional
    public void processBatch() {
        List<OutboxRow> rows = jdbcTemplate.query(
                """
                SELECT id, aggregate_type, aggregate_id, event_type, payload::text, attempts
                FROM outbox_event
                WHERE processed_at IS NULL
                ORDER BY created_at
                FOR UPDATE SKIP LOCKED
                LIMIT 10
                """,
                (rs, rowNum) -> new OutboxRow(
                        rs.getObject("id", UUID.class),
                        rs.getString("aggregate_type"),
                        rs.getLong("aggregate_id"),
                        rs.getString("event_type"),
                        rs.getString("payload"),
                        rs.getInt("attempts")
                )
        );

        for (OutboxRow row : rows) {
            try {
                dispatch(row);
                jdbcTemplate.update(
                        "UPDATE outbox_event SET processed_at = now() WHERE id = ?",
                        row.id()
                );
            } catch (Exception ex) {
                int nextAttempts = row.attempts() + 1;
                if (nextAttempts >= 3) {
                    jdbcTemplate.update(
                            "UPDATE outbox_event SET attempts = ?, last_error = ?, processed_at = now() WHERE id = ?",
                            nextAttempts,
                            "DEAD_LETTER: " + ex.getMessage(),
                            row.id()
                    );
                    meterRegistry.counter("mesaro.outbox.dead_letters",
                            "event_type", row.eventType()).increment();
                    log.error("Outbox event {} (type={}) moved to dead-letter after {} attempts. Last error: {}",
                            row.id(), row.eventType(), nextAttempts, ex.getMessage());
                } else {
                    jdbcTemplate.update(
                            "UPDATE outbox_event SET attempts = ?, last_error = ? WHERE id = ?",
                            nextAttempts,
                            ex.getMessage(),
                            row.id()
                    );
                }
            }
        }
    }

    private void dispatch(OutboxRow row) {
        try {
            JsonNode payload = objectMapper.readTree(row.payload());
            switch (row.eventType()) {
                case "ReservationConfirmed" -> handleReservationConfirmed(row, payload);
                default -> log.warn("Outbox event type '{}' is not handled; marking processed. id={}", row.eventType(), row.id());
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to dispatch outbox event " + row.id(), ex);
        }
    }

    private void handleReservationConfirmed(OutboxRow row, JsonNode payload) throws Exception {
        ReservationEmailData emailData = objectMapper.treeToValue(payload, ReservationEmailData.class);
        if (emailData == null || emailData.guestEmail() == null || emailData.guestEmail().isBlank()) {
            throw new IllegalArgumentException("ReservationConfirmed payload missing guest email");
        }

        if (emailSendLogService.wasSent("RESERVATION_CONFIRMATION", "RESERVATION", row.aggregateId())) {
            return;
        }

        String subject = "Reservation Confirmed - " + emailData.restaurantName() + " (" + emailData.confirmationCode() + ")";
        try {
            reservationConfirmationEmailSender.send(emailData);
            emailSendLogService.logSent(
                    null,
                    emailData.guestEmail(),
                    "RESERVATION_CONFIRMATION",
                    subject,
                    "RESERVATION",
                    row.aggregateId()
            );
        } catch (Exception ex) {
            emailSendLogService.logFailed(
                    null,
                    emailData.guestEmail(),
                    "RESERVATION_CONFIRMATION",
                    subject,
                    "RESERVATION",
                    row.aggregateId(),
                    ex.getMessage()
            );
            throw ex;
        }
    }

    private record OutboxRow(UUID id, String aggregateType, Long aggregateId, String eventType, String payload, int attempts) {
    }
}
