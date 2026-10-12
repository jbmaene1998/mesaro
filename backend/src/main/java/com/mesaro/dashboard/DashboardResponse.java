package com.mesaro.dashboard;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Complete dashboard data for a restaurant.
 */
public record DashboardResponse(
        Long restaurantId,
        String restaurantName,
        String timezone,
        LocalDate date,
        DailyStats stats,
        ShiftStatus currentShift,
        List<ShiftStatus> allShifts,
        List<UpcomingReservation> upcomingReservations,
        Instant generatedAt
) {
}
