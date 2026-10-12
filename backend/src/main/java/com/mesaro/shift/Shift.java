package com.mesaro.shift;

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

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "shift")
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "last_reservation_time", nullable = false)
    private LocalTime lastReservationTime;

    @Column(name = "max_covers", nullable = false)
    private int maxCovers;

    @Column(name = "slot_duration_minutes", nullable = false)
    private int slotDurationMinutes = 15;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShiftStatus status = ShiftStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Transient
    private Integer overCapacityDayCount;

    protected Shift() {
    }

    public Shift(Restaurant restaurant, String name, DayOfWeek dayOfWeek,
                 LocalTime startTime, LocalTime endTime, int maxCovers) {
        this.restaurant = restaurant;
        this.name = name;
        this.dayOfWeek = dayOfWeek.getValue();
        this.startTime = startTime;
        this.endTime = endTime;
        this.lastReservationTime = endTime;
        this.maxCovers = maxCovers;
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

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getDayOfWeek() {
        return dayOfWeek;
    }

    public DayOfWeek getDayOfWeekEnum() {
        return DayOfWeek.of(dayOfWeek);
    }

    public void setDayOfWeek(int dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public void setDayOfWeek(DayOfWeek dayOfWeek) {
        this.dayOfWeek = dayOfWeek.getValue();
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public int getMaxCovers() {
        return maxCovers;
    }

    public void setMaxCovers(int maxCovers) {
        this.maxCovers = maxCovers;
    }

    public LocalTime getLastReservationTime() {
        return lastReservationTime;
    }

    public void setLastReservationTime(LocalTime lastReservationTime) {
        this.lastReservationTime = lastReservationTime;
    }

    public int getSlotDurationMinutes() {
        return slotDurationMinutes;
    }

    public void setSlotDurationMinutes(int slotDurationMinutes) {
        this.slotDurationMinutes = slotDurationMinutes;
    }

    public ShiftStatus getStatus() {
        return status;
    }

    public void setStatus(ShiftStatus status) {
        this.status = status;
    }

    public boolean isEditable() {
        return status == ShiftStatus.DRAFT;
    }

    public boolean isActive() {
        return status == ShiftStatus.ACTIVE;
    }

    public boolean overlaps(LocalTime otherStart, LocalTime otherEnd) {
        return startTime.isBefore(otherEnd) && endTime.isAfter(otherStart);
    }

    public boolean isOvernight() {
        return !endTime.isAfter(startTime);
    }

    public int serviceStartMinute() {
        return toMinute(startTime);
    }

    public int serviceEndMinute() {
        int end = toMinute(endTime);
        return isOvernight() ? end + (24 * 60) : end;
    }

    public int lastReservationMinute() {
        int last = toMinute(lastReservationTime);
        return isOvernight() && last < serviceStartMinute() ? last + (24 * 60) : last;
    }

    public boolean isReservableAt(int requestedDayOfWeek, LocalTime requestedTime) {
        int startDay = this.dayOfWeek;
        int nextDay = startDay == 7 ? 1 : startDay + 1;

        int minute = toMinute(requestedTime);
        if (isOvernight() && requestedDayOfWeek == nextDay) {
            minute += 24 * 60;
        } else if (requestedDayOfWeek != startDay) {
            return false;
        }

        return minute >= serviceStartMinute() && minute <= lastReservationMinute();
    }

    private int toMinute(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Integer getOverCapacityDayCount() {
        return overCapacityDayCount;
    }

    public void setOverCapacityDayCount(Integer overCapacityDayCount) {
        this.overCapacityDayCount = overCapacityDayCount;
    }
}
