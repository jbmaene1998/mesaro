package com.mesaro.dashboard;

public record PortfolioTotals(
        int totalRestaurants,
        int totalReservations,
        int totalCovers,
        int totalNoShows
) {
}
