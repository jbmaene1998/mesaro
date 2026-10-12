package com.mesaro.planning;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "staff_weekly_work_hours")
public class StaffWeeklyWorkHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "planned_hours", nullable = false, precision = 6, scale = 2)
    private BigDecimal plannedHours;

    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;

    @Column(name = "updated_at_utc", nullable = false)
    private Instant updatedAtUtc;

    protected StaffWeeklyWorkHours() {
    }

    public StaffWeeklyWorkHours(Restaurant restaurant, UserAccount user, LocalDate weekStartDate, BigDecimal plannedHours) {
        this.restaurant = restaurant;
        this.user = user;
        this.weekStartDate = weekStartDate;
        this.plannedHours = plannedHours;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAtUtc == null) {
            createdAtUtc = now;
        }
        updatedAtUtc = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAtUtc = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public UserAccount getUser() {
        return user;
    }

    public LocalDate getWeekStartDate() {
        return weekStartDate;
    }

    public BigDecimal getPlannedHours() {
        return plannedHours;
    }

    public void setPlannedHours(BigDecimal plannedHours) {
        this.plannedHours = plannedHours;
    }
}
