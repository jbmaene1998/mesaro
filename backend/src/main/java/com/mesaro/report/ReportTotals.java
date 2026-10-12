package com.mesaro.report;

public record ReportTotals(
        int totalReservations,
        int totalCovers,
        double averagePartySize,
        double noShowRatePercent,
        double cancellationRatePercent
) {
}
