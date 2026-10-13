package com.mesaro.gdpr;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.config.AppProperties;
import com.mesaro.reservation.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class GdprRetentionService {

    private static final Logger log = LoggerFactory.getLogger(GdprRetentionService.class);

    private final AppProperties appProperties;
    private final ReservationRepository reservationRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public GdprRetentionService(AppProperties appProperties,
                                ReservationRepository reservationRepository,
                                JdbcTemplate jdbcTemplate,
                                AuditService auditService) {
        this.appProperties = appProperties;
        this.reservationRepository = reservationRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional
    @Scheduled(cron = "${app.gdpr.retention-cron:0 15 2 * * *}")
    public void enforceRetentionPolicies() {
        if (!appProperties.getGdpr().isRetentionEnabled()) {
            return;
        }

        Instant now = Instant.now();
        Instant reservationCutoff = now.minus(appProperties.getGdpr().getReservationPiiRetentionDays(), ChronoUnit.DAYS);
        Instant emailCutoff = now.minus(appProperties.getGdpr().getEmailLogRetentionDays(), ChronoUnit.DAYS);
        Instant auditCutoff = now.minus(appProperties.getGdpr().getAuditLogRetentionDays(), ChronoUnit.DAYS);
        Instant outboxCutoff = now.minus(appProperties.getGdpr().getReservationPiiRetentionDays(), ChronoUnit.DAYS);

        int anonymizedReservations = reservationRepository.anonymizePersonalDataBefore(reservationCutoff);
        int anonymizedEmailLogs = anonymizeReservationEmailLogs();
        int deletedEmailLogs = deleteEmailLogsBefore(emailCutoff);
        int deletedAuditEvents = deleteAuditEventsBefore(auditCutoff);
        int deletedOutboxEvents = deleteProcessedOutboxEventsBefore(outboxCutoff);

        if (anonymizedReservations > 0 || anonymizedEmailLogs > 0 || deletedEmailLogs > 0 || deletedAuditEvents > 0 || deletedOutboxEvents > 0) {
            log.info("GDPR retention cleanup complete: anonymizedReservations={}, anonymizedEmailLogs={}, deletedEmailLogs={}, deletedAuditEvents={}, deletedOutboxEvents={}",
                    anonymizedReservations, anonymizedEmailLogs, deletedEmailLogs, deletedAuditEvents, deletedOutboxEvents);
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("anonymizedReservations", anonymizedReservations);
            details.put("anonymizedEmailLogs", anonymizedEmailLogs);
            details.put("deletedEmailLogs", deletedEmailLogs);
            details.put("deletedAuditEvents", deletedAuditEvents);
            details.put("deletedOutboxEvents", deletedOutboxEvents);
            auditService.record(
                    AuditEventType.GDPR_RETENTION_ENFORCED,
                    null,
                    null,
                    null,
                    "GDPR",
                    details
            );
        }
    }

    private int anonymizeReservationEmailLogs() {
        int anonymized = jdbcTemplate.update("""
                UPDATE email_send_log el
                SET recipient_email = 'anonymized@deleted.mesaro'
                WHERE el.reference_type = 'RESERVATION'
                  AND el.recipient_email <> 'anonymized@deleted.mesaro'
                  AND EXISTS (
                      SELECT 1 FROM reservation r
                      WHERE r.id = el.reference_id
                        AND r.guest_email LIKE 'deleted+%@anonymized.invalid'
                  )
                """);
        if (anonymized > 0) {
            log.info("GDPR: anonymized recipient_email in {} email_send_log rows", anonymized);
        }
        return anonymized;
    }

    private int deleteEmailLogsBefore(Instant cutoff) {
        return jdbcTemplate.update(
                "DELETE FROM email_send_log WHERE created_at_utc < ?",
                Timestamp.from(cutoff)
        );
    }

    private int deleteAuditEventsBefore(Instant cutoff) {
        return jdbcTemplate.update(
                "DELETE FROM audit_event WHERE created_at_utc < ?",
                Timestamp.from(cutoff)
        );
    }

    private int deleteProcessedOutboxEventsBefore(Instant cutoff) {
        return jdbcTemplate.update(
                "DELETE FROM outbox_event WHERE processed_at IS NOT NULL AND processed_at < ?",
                Timestamp.from(cutoff)
        );
    }
}
