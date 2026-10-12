package com.mesaro.vacation;

import com.mesaro.restaurant.Restaurant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "vacation")
public class Vacation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VacationType type;

    @Column(length = 50)
    private String reason;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VacationStatus status = VacationStatus.PENDING;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Transient
    private Integer affectedReservations;

    protected Vacation() {
    }

    private Vacation(Restaurant restaurant, VacationType type, LocalDate startDate, LocalDate endDate) {
        this.restaurant = restaurant;
        this.type = type;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public static Vacation createClosure(Restaurant restaurant, ClosureReason reason,
                                          LocalDate startDate, LocalDate endDate) {
        Vacation vacation = new Vacation(restaurant, VacationType.RESTAURANT_CLOSURE, startDate, endDate);
        vacation.reason = reason.name();
        vacation.status = VacationStatus.APPROVED;
        return vacation;
    }

    public static Vacation createStaffVacation(Restaurant restaurant, Long userId, VacationReason reason,
                                                LocalDate startDate, LocalDate endDate) {
        Vacation vacation = new Vacation(restaurant, VacationType.STAFF_VACATION, startDate, endDate);
        vacation.userId = userId;
        vacation.reason = reason.name();
        vacation.status = VacationStatus.PENDING;
        return vacation;
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

    public boolean overlaps(LocalDate otherStart, LocalDate otherEnd) {
        return !startDate.isAfter(otherEnd) && !endDate.isBefore(otherStart);
    }

    public boolean containsDate(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    public boolean isClosure() {
        return type == VacationType.RESTAURANT_CLOSURE;
    }

    public boolean isStaffVacation() {
        return type == VacationType.STAFF_VACATION;
    }

    public boolean isApproved() {
        return status == VacationStatus.APPROVED;
    }

    public boolean isPending() {
        return status == VacationStatus.PENDING;
    }

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public Long getUserId() {
        return userId;
    }

    public VacationType getType() {
        return type;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public VacationStatus getStatus() {
        return status;
    }

    public void setStatus(VacationStatus status) {
        this.status = status;
    }

    public Long getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(Long approvedBy) {
        this.approvedBy = approvedBy;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }

    public Integer getAffectedReservations() {
        return affectedReservations;
    }

    public void setAffectedReservations(Integer affectedReservations) {
        this.affectedReservations = affectedReservations;
    }
}
