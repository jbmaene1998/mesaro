package com.mesaro.table;

import java.time.Instant;

public record DiningTableResponse(
        Long id,
        Long restaurantId,
        String label,
        int seats,
        TableStatus status,
        String area,
        boolean allowCrossAreaCombine,
        Boolean available,
        Long upcomingActiveReservations,
        Long upcomingActiveHolds,
        Instant createdAt,
        Instant updatedAt
) {
    public static DiningTableResponse from(DiningTable table) {
        return from(table, null);
    }

    public static DiningTableResponse from(DiningTable table, Boolean available) {
        return new DiningTableResponse(
                table.getId(),
                table.getRestaurant().getId(),
                table.getLabel(),
                table.getSeats(),
                table.getStatus(),
                table.getArea(),
                table.isAllowCrossAreaCombine(),
                available,
                table.getUpcomingActiveReservations(),
                table.getUpcomingActiveHolds(),
                table.getCreatedAt(),
                table.getUpdatedAt()
        );
    }
}
