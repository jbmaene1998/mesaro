package com.mesaro.restaurant;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.mesaro.openinghours.OpeningHours;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record OpeningHoursResponse(
        Integer dayOfWeek,
        String dayName,
        boolean open,
        @JsonFormat(pattern = "HH:mm")
        LocalTime openLocalTime,
        @JsonFormat(pattern = "HH:mm")
        LocalTime closeLocalTime
) {
    public static OpeningHoursResponse from(OpeningHours openingHours) {
        boolean isOpen = openingHours.getOpenLocalTime() != null && openingHours.getCloseLocalTime() != null;
        return new OpeningHoursResponse(
                openingHours.getDayOfWeek(),
                DayOfWeek.of(openingHours.getDayOfWeek()).name(),
                isOpen,
                openingHours.getOpenLocalTime(),
                openingHours.getCloseLocalTime()
        );
    }

    public static OpeningHoursResponse closed(int dayOfWeek) {
        return new OpeningHoursResponse(
                dayOfWeek,
                DayOfWeek.of(dayOfWeek).name(),
                false,
                null,
                null
        );
    }
}
