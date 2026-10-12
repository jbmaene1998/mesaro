package com.mesaro.email;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;

@Service
public class EmailSendLogService {

    private final JdbcTemplate jdbcTemplate;

    public EmailSendLogService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean wasSent(String emailType, String referenceType, Long referenceId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(1)
                FROM email_send_log
                WHERE email_type = ?
                  AND reference_type = ?
                  AND reference_id = ?
                  AND status = 'SENT'
                """,
                Integer.class,
                emailType,
                referenceType,
                referenceId
        );
        return count != null && count > 0;
    }

    public void logSent(Long restaurantId,
                        String recipientEmail,
                        String emailType,
                        String subject,
                        String referenceType,
                        Long referenceId) {
        Instant now = Instant.now();
        jdbcTemplate.update(
                """
                INSERT INTO email_send_log (
                    restaurant_id,
                    recipient_email,
                    email_type,
                    subject,
                    status,
                    reference_type,
                    reference_id,
                    sent_at_utc,
                    created_at_utc
                ) VALUES (?, ?, ?, ?, 'SENT', ?, ?, ?, ?)
                """,
                restaurantId,
                recipientEmail,
                emailType,
                subject,
                referenceType,
                referenceId,
                Timestamp.from(now),
                Timestamp.from(now)
        );
    }

    public void logFailed(Long restaurantId,
                          String recipientEmail,
                          String emailType,
                          String subject,
                          String referenceType,
                          Long referenceId,
                          String errorMessage) {
        Instant now = Instant.now();
        jdbcTemplate.update(
                """
                INSERT INTO email_send_log (
                    restaurant_id,
                    recipient_email,
                    email_type,
                    subject,
                    status,
                    error_message,
                    reference_type,
                    reference_id,
                    created_at_utc
                ) VALUES (?, ?, ?, ?, 'FAILED', ?, ?, ?, ?)
                """,
                restaurantId,
                recipientEmail,
                emailType,
                subject,
                truncate(errorMessage, 1000),
                referenceType,
                referenceId,
                Timestamp.from(now)
        );
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
