package com.mesaro.openinghours;

import com.mesaro.restaurant.Restaurant;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

@Entity
@Table(name = "opening_hours")
public class OpeningHours {

    @EmbeddedId
    private OpeningHoursId id;

    @MapsId("restaurantId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @NotNull(message = "Day of week is required")
    @Min(value = 1, message = "Day of week must be between 1 and 7")
    @Max(value = 7, message = "Day of week must be between 1 and 7")
    @Column(name = "day_of_week", nullable = false, insertable = false, updatable = false)
    private Integer dayOfWeek;

    @Column(name = "open_local_time")
    private LocalTime openLocalTime;

    @Column(name = "close_local_time")
    private LocalTime closeLocalTime;

    protected OpeningHours() {
    }

    public OpeningHours(Restaurant restaurant, int dayOfWeek, LocalTime openLocalTime, LocalTime closeLocalTime) {
        this.id = new OpeningHoursId(restaurant.getId(), dayOfWeek);
        this.restaurant = restaurant;
        this.dayOfWeek = dayOfWeek;
        this.openLocalTime = openLocalTime;
        this.closeLocalTime = closeLocalTime;
    }

    public OpeningHoursId getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public Integer getDayOfWeek() {
        return dayOfWeek;
    }

    public LocalTime getOpenLocalTime() {
        return openLocalTime;
    }

    public void setOpenLocalTime(LocalTime openLocalTime) {
        this.openLocalTime = openLocalTime;
    }

    public LocalTime getCloseLocalTime() {
        return closeLocalTime;
    }

    public void setCloseLocalTime(LocalTime closeLocalTime) {
        this.closeLocalTime = closeLocalTime;
    }

    @AssertTrue(message = "Open time must be before close time")
    public boolean isOpenBeforeClose() {
        if (openLocalTime == null && closeLocalTime == null) {
            return true;
        }
        if (openLocalTime == null || closeLocalTime == null) {
            return false;
        }
        return openLocalTime.isBefore(closeLocalTime);
    }
}
