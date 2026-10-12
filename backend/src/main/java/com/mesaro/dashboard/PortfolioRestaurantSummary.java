package com.mesaro.dashboard;

import java.time.LocalDate;

public record PortfolioRestaurantSummary(
        Long restaurantId,
        String restaurantName,
        String timezone,
        LocalDate date,
        int totalReservations,
        int totalCovers,
        int noShowCount,
        String currentShiftName,
        Integer currentShiftCovers,
        Integer currentShiftMaxCovers
) {
}
