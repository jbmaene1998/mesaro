package com.mesaro.dashboard;

import java.time.Instant;
import java.util.List;

public record PortfolioDashboardResponse(
        Instant generatedAt,
        List<PortfolioRestaurantSummary> restaurants,
        PortfolioTotals totals
) {
}
