package com.mesaro.restaurant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;

@Entity
@Table(name = "restaurant")
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String slug;

    @Column(nullable = false, length = 50)
    private String timezone;

    @Column(nullable = false, length = 10)
    private String locale = "en";

    @Column(name = "booking_enabled", nullable = false)
    private boolean bookingEnabled = true;

    @Column(name = "slot_interval_minutes", nullable = false)
    private int slotIntervalMinutes = 15;

    @Column(name = "default_duration_minutes", nullable = false)
    private int defaultDurationMinutes = 90;

    @Column(name = "min_notice_minutes", nullable = false)
    private int minNoticeMinutes = 0;

    @Column(name = "max_advance_days", nullable = false)
    private int maxAdvanceDays = 90;

    @Column(name = "max_party_size", nullable = false)
    private int maxPartySize = 20;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_mode", nullable = false, length = 10)
    private AssignmentMode assignmentMode = AssignmentMode.AUTO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RestaurantStatus status = RestaurantStatus.ACTIVE;

    @Column(name = "deleted_at_utc")
    private Instant deletedAtUtc;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    protected Restaurant() {
    }

    public Restaurant(String name, String slug, String timezone) {
        this.name = name;
        this.slug = slug;
        this.timezone = timezone;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public boolean isBookingEnabled() {
        return bookingEnabled;
    }

    public void setBookingEnabled(boolean bookingEnabled) {
        this.bookingEnabled = bookingEnabled;
    }

    public int getSlotIntervalMinutes() {
        return slotIntervalMinutes;
    }

    public void setSlotIntervalMinutes(int slotIntervalMinutes) {
        this.slotIntervalMinutes = slotIntervalMinutes;
    }

    public int getDefaultDurationMinutes() {
        return defaultDurationMinutes;
    }

    public void setDefaultDurationMinutes(int defaultDurationMinutes) {
        this.defaultDurationMinutes = defaultDurationMinutes;
    }

    public int getMinNoticeMinutes() {
        return minNoticeMinutes;
    }

    public void setMinNoticeMinutes(int minNoticeMinutes) {
        this.minNoticeMinutes = minNoticeMinutes;
    }

    public int getMaxAdvanceDays() {
        return maxAdvanceDays;
    }

    public void setMaxAdvanceDays(int maxAdvanceDays) {
        this.maxAdvanceDays = maxAdvanceDays;
    }

    public int getMaxPartySize() {
        return maxPartySize;
    }

    public void setMaxPartySize(int maxPartySize) {
        this.maxPartySize = maxPartySize;
    }

    public AssignmentMode getAssignmentMode() {
        return assignmentMode;
    }

    public void setAssignmentMode(AssignmentMode assignmentMode) {
        this.assignmentMode = assignmentMode;
    }

    public RestaurantStatus getStatus() {
        return status;
    }

    public void setStatus(RestaurantStatus status) {
        this.status = status;
    }

    public Instant getDeletedAtUtc() {
        return deletedAtUtc;
    }

    public void setDeletedAtUtc(Instant deletedAtUtc) {
        this.deletedAtUtc = deletedAtUtc;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Long getVersion() {
        return version;
    }
}
