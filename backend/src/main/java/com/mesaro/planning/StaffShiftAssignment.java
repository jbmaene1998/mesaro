package com.mesaro.planning;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.shift.Shift;
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
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "staff_shift_assignment")
public class StaffShiftAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "service_date", nullable = false)
    private LocalDate serviceDate;

    @Column(name = "planned_start_local_time", nullable = false)
    private LocalTime plannedStartLocalTime;

    @Column(name = "planned_end_local_time", nullable = false)
    private LocalTime plannedEndLocalTime;

    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;

    protected StaffShiftAssignment() {
    }

    public StaffShiftAssignment(Restaurant restaurant,
                                Shift shift,
                                UserAccount user,
                                LocalDate serviceDate,
                                LocalTime plannedStartLocalTime,
                                LocalTime plannedEndLocalTime) {
        this.restaurant = restaurant;
        this.shift = shift;
        this.user = user;
        this.serviceDate = serviceDate;
        this.plannedStartLocalTime = plannedStartLocalTime;
        this.plannedEndLocalTime = plannedEndLocalTime;
    }

    @PrePersist
    void prePersist() {
        if (createdAtUtc == null) {
            createdAtUtc = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public Shift getShift() {
        return shift;
    }

    public UserAccount getUser() {
        return user;
    }

    public LocalDate getServiceDate() {
        return serviceDate;
    }

    public LocalTime getPlannedStartLocalTime() {
        return plannedStartLocalTime;
    }

    public LocalTime getPlannedEndLocalTime() {
        return plannedEndLocalTime;
    }
}
