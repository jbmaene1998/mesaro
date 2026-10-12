package com.mesaro.dashboard;

import java.time.LocalDate;
import java.util.List;

public record WeeklyStatsResponse(
        Long restaurantId,
        String timezone,
        LocalDate startDate,
        LocalDate endDate,
        List<DailyStats> days
) {
}
