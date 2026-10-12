package com.mesaro.restaurant;

import java.time.Instant;

public record RestaurantResponse(
        Long id,
        String name,
        String slug,
        String timezone,
        String locale,
        boolean bookingEnabled,
        int slotIntervalMinutes,
        int defaultDurationMinutes,
        int minNoticeMinutes,
        int maxAdvanceDays,
        int maxPartySize,
        AssignmentMode assignmentMode,
        Instant createdAt,
        Instant updatedAt
) {
    public static RestaurantResponse from(Restaurant restaurant) {
        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getSlug(),
                restaurant.getTimezone(),
                restaurant.getLocale(),
                restaurant.isBookingEnabled(),
                restaurant.getSlotIntervalMinutes(),
                restaurant.getDefaultDurationMinutes(),
                restaurant.getMinNoticeMinutes(),
                restaurant.getMaxAdvanceDays(),
                restaurant.getMaxPartySize(),
                restaurant.getAssignmentMode(),
                restaurant.getCreatedAt(),
                restaurant.getUpdatedAt()
        );
    }
}
