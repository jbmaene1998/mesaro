package com.mesaro.table;

import java.time.Instant;
import java.util.List;

public record TableCombinationResponse(
        Long id,
        Long restaurantId,
        String name,
        int minCapacity,
        int maxCapacity,
        int totalSeats,
        List<TableSummary> tables,
        Instant createdAt,
        Instant updatedAt
) {
    public record TableSummary(Long id, String label, int seats) {
        public static TableSummary from(DiningTable table) {
            return new TableSummary(table.getId(), table.getLabel(), table.getSeats());
        }
    }

    public static TableCombinationResponse from(TableCombination combination) {
        List<TableSummary> tableSummaries = combination.getTables().stream()
                .map(TableSummary::from)
                .toList();

        return new TableCombinationResponse(
                combination.getId(),
                combination.getRestaurant().getId(),
                combination.getName(),
                combination.getMinCapacity(),
                combination.getMaxCapacity(),
                combination.getTotalSeats(),
                tableSummaries,
                combination.getCreatedAt(),
                combination.getUpdatedAt()
        );
    }
}
