package com.mesaro.openinghours;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class OpeningHoursId implements Serializable {

    @Column(name = "restaurant_id", nullable = false)
    private Long restaurantId;

    @Column(name = "day_of_week", nullable = false)
    private Integer dayOfWeek;

    protected OpeningHoursId() {
    }

    public OpeningHoursId(Long restaurantId, Integer dayOfWeek) {
        this.restaurantId = restaurantId;
        this.dayOfWeek = dayOfWeek;
    }

    public Long getRestaurantId() {
        return restaurantId;
    }

    public Integer getDayOfWeek() {
        return dayOfWeek;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        OpeningHoursId that = (OpeningHoursId) o;
        return Objects.equals(restaurantId, that.restaurantId)
                && Objects.equals(dayOfWeek, that.dayOfWeek);
    }

    @Override
    public int hashCode() {
        return Objects.hash(restaurantId, dayOfWeek);
    }
}
