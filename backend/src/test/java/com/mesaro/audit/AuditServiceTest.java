package com.mesaro.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditEventRepository auditEventRepository;

    @Test
    void record_redactsSensitiveFieldsInPersistedPayload() throws Exception {
        AuditService auditService = new AuditService(auditEventRepository, new ObjectMapper());

        auditService.recordReservationEvent(
                AuditEventType.RESERVATION_UPDATED,
                10L,
                99L,
                123L,
                Map.of(
                        "guestEmail", "alice@example.com",
                        "guestPhone", "+1-555-123-9876",
                        "notes", "Window seat please",
                        "cancelToken", "cancel-secret-token",
                        "authorization", "Bearer very-secret-jwt",
                        "password", "plain-text-password",
                        "nested", Map.of(
                                "inviteToken", "invite-secret-token",
                                "apiSecret", "secret-value"
                        )
                )
        );

        ArgumentCaptor<AuditEventEntity> captor = ArgumentCaptor.forClass(AuditEventEntity.class);
        verify(auditEventRepository).save(captor.capture());

        AuditEventEntity saved = captor.getValue();
        JsonNode payload = new ObjectMapper().readTree(saved.getPayloadJson());
        JsonNode details = payload.get("details");

        assertThat(saved.getActorUserId()).isEqualTo(99L);
        assertThat(details.get("guestEmail").asText()).isEqualTo("a***@example.com");
        assertThat(details.get("guestPhone").asText()).isEqualTo("***9876");
        assertThat(details.get("notes").asText()).isEqualTo("[REDACTED]");
        assertThat(details.get("cancelToken").asText()).isEqualTo("[REDACTED]");
        assertThat(details.get("authorization").asText()).isEqualTo("[REDACTED]");
        assertThat(details.get("password").asText()).isEqualTo("[REDACTED]");
        assertThat(details.get("nested").get("inviteToken").asText()).isEqualTo("[REDACTED]");
        assertThat(details.get("nested").get("apiSecret").asText()).isEqualTo("[REDACTED]");

        assertThat(saved.getPayloadJson()).doesNotContain("cancel-secret-token");
        assertThat(saved.getPayloadJson()).doesNotContain("very-secret-jwt");
        assertThat(saved.getPayloadJson()).doesNotContain("plain-text-password");
        assertThat(saved.getPayloadJson()).doesNotContain("invite-secret-token");
        assertThat(saved.getPayloadJson()).doesNotContain("secret-value");
    }
}
