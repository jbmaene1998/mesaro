package com.mesaro.dashboard;

import java.time.LocalDate;
import java.util.Map;

/**
 * Daily statistics for a restaurant.
 */
public record DailyStats(
        LocalDate date,
        int totalReservations,
        int totalCovers,
        Map<String, Integer> byStatus,
        int confirmedCount,
        int seatedCount,
        int completedCount,
        int noShowCount,
        int cancelledCount
) {
    public static DailyStats empty(LocalDate date) {
        return new DailyStats(date, 0, 0, Map.of(), 0, 0, 0, 0, 0);
    }
}
