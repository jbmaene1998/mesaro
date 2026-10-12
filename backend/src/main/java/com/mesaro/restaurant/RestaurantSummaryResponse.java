package com.mesaro.restaurant;

public record RestaurantSummaryResponse(
        Long id,
        String name,
        String slug,
        String timezone,
        String locale,
        boolean bookingEnabled,
        Integer slotIntervalMinutes,
        Integer defaultDurationMinutes,
        Integer minNoticeMinutes,
        Integer maxAdvanceDays,
        Integer maxPartySize,
        AssignmentMode assignmentMode,
        RestaurantStatus status
) {
    public static RestaurantSummaryResponse from(Restaurant restaurant) {
        return new RestaurantSummaryResponse(
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
                restaurant.getStatus()
        );
    }
}
