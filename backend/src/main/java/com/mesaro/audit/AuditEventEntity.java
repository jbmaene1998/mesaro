package com.mesaro.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "audit_event")
public class AuditEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "restaurant_id")
    private Long restaurantId;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;

    protected AuditEventEntity() {
    }

    public AuditEventEntity(Long restaurantId, Long actorUserId, String eventType, String payloadJson) {
        this.restaurantId = restaurantId;
        this.actorUserId = actorUserId;
        this.eventType = eventType;
        this.payloadJson = payloadJson;
    }

    @PrePersist
    void prePersist() {
        this.createdAtUtc = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getRestaurantId() {
        return restaurantId;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public String getEventType() {
        return eventType;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public Instant getCreatedAtUtc() {
        return createdAtUtc;
    }
}
