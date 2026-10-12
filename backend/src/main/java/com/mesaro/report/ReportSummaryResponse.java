package com.mesaro.report;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ReportSummaryResponse(
        Long restaurantId,
        String restaurantName,
        String timezone,
        LocalDate startDate,
        LocalDate endDate,
        Instant generatedAt,
        ReportTotals totals,
        Map<String, Integer> statusBreakdown,
        List<ReportDailyRow> dailyBreakdown,
        List<ReportShiftRow> shiftBreakdown
) {
}
