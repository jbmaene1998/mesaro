package com.mesaro.ops;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Surfaces failed Stripe webhooks and stuck outbox rows.
 * Logged on a timer and exposed as the {@code opsSignal} health indicator.
 * Not part of the readiness group, so a billing backlog does not restart the API.
 */
@Service("opsSignal")
public class OpsSignalService implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(OpsSignalService.class);
    private static final String FAILED_WEBHOOKS_SQL =
            "SELECT COUNT(*) FROM stripe_webhook_event WHERE status = 'failed'";
    private static final String STUCK_OUTBOX_SQL =
            "SELECT COUNT(*) FROM outbox_event WHERE processed_at IS NULL AND created_at < ?";

    private final JdbcTemplate jdbcTemplate;
    private final boolean alertsEnabled;
    private final int outboxMaxAgeMinutes;

    public OpsSignalService(
            JdbcTemplate jdbcTemplate,
            @Value("${app.ops.alerts-enabled:true}") boolean alertsEnabled,
            @Value("${app.ops.outbox-max-age-minutes:15}") int outboxMaxAgeMinutes) {
        this.jdbcTemplate = jdbcTemplate;
        this.alertsEnabled = alertsEnabled;
        this.outboxMaxAgeMinutes = Math.max(1, outboxMaxAgeMinutes);
    }

    @Scheduled(fixedDelayString = "${app.ops.alert-interval-ms:60000}")
    public void logIfUnhealthy() {
        if (!alertsEnabled) {
            return;
        }
        Snapshot snapshot;
        try {
            snapshot = snapshot();
        } catch (RuntimeException ex) {
            log.error("OPS alert: could not read webhook or outbox status ({})", ex.getClass().getSimpleName());
            return;
        }
        if (snapshot.failedWebhooks() > 0) {
            log.error("OPS alert: {} Stripe webhook events are in failed status", snapshot.failedWebhooks());
        }
        if (snapshot.stuckOutbox() > 0) {
            log.error("OPS alert: {} outbox events are older than {} minutes",
                    snapshot.stuckOutbox(), outboxMaxAgeMinutes);
        }
    }

    @Override
    public Health health() {
        try {
            Snapshot snapshot = snapshot();
            Health.Builder builder = snapshot.healthy() ? Health.up() : Health.down();
            return builder
                    .withDetail("failedWebhooks", snapshot.failedWebhooks())
                    .withDetail("stuckOutbox", snapshot.stuckOutbox())
                    .build();
        } catch (RuntimeException ex) {
            log.warn("OPS signal query failed: {}", ex.getClass().getSimpleName());
            return Health.down().withDetail("error", "ops signal query failed").build();
        }
    }

    Snapshot snapshot() {
        Long failed = jdbcTemplate.queryForObject(FAILED_WEBHOOKS_SQL, Long.class);
        Instant cutoff = Instant.now().minus(outboxMaxAgeMinutes, ChronoUnit.MINUTES);
        Long stuck = jdbcTemplate.queryForObject(STUCK_OUTBOX_SQL, Long.class, java.sql.Timestamp.from(cutoff));
        return new Snapshot(failed == null ? 0 : failed, stuck == null ? 0 : stuck);
    }

    record Snapshot(long failedWebhooks, long stuckOutbox) {
        boolean healthy() {
            return failedWebhooks == 0 && stuckOutbox == 0;
        }
    }
}
