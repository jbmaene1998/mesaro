package com.mesaro.gdpr;

import com.mesaro.config.AppProperties;
import com.mesaro.reservation.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GdprRetentionServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private AppProperties appProperties;
    private GdprRetentionService gdprRetentionService;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        appProperties.getGdpr().setRetentionEnabled(true);
        appProperties.getGdpr().setReservationPiiRetentionDays(365);
        appProperties.getGdpr().setEmailLogRetentionDays(365);
        appProperties.getGdpr().setAuditLogRetentionDays(365);
        gdprRetentionService = new GdprRetentionService(appProperties, reservationRepository, jdbcTemplate);
    }

    @Test
    void enforceRetentionPolicies_deletesEmailAndAuditLogs_andAnonymizesReservations() {
        when(reservationRepository.anonymizePersonalDataBefore(any(Instant.class))).thenReturn(3);
        when(jdbcTemplate.update(anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(Timestamp.class))).thenReturn(2, 4);

        gdprRetentionService.enforceRetentionPolicies();

        verify(reservationRepository).anonymizePersonalDataBefore(any(Instant.class));
        verify(jdbcTemplate).update(eq("DELETE FROM email_send_log WHERE created_at_utc < ?"), any(Timestamp.class));
        verify(jdbcTemplate).update(eq("DELETE FROM audit_event WHERE created_at_utc < ?"), any(Timestamp.class));
    }

    @Test
    void enforceRetentionPolicies_noopWhenDisabled() {
        appProperties.getGdpr().setRetentionEnabled(false);

        gdprRetentionService.enforceRetentionPolicies();

        verify(reservationRepository, never()).anonymizePersonalDataBefore(any(Instant.class));
        verify(jdbcTemplate, never()).update(anyString(), any(Timestamp.class));
    }
}
