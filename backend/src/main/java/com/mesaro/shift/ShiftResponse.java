package com.mesaro.shift;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;

public record ShiftResponse(
        Long id,
        Long restaurantId,
        String name,
        int dayOfWeek,
        String dayOfWeekName,
        LocalTime startTime,
        LocalTime endTime,
        LocalTime lastReservationTime,
        int maxCovers,
        Integer overCapacityDayCount,
        int slotDurationMinutes,
        ShiftStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static ShiftResponse from(Shift shift) {
        return new ShiftResponse(
                shift.getId(),
                shift.getRestaurant().getId(),
                shift.getName(),
                shift.getDayOfWeek(),
                DayOfWeek.of(shift.getDayOfWeek()).name(),
                shift.getStartTime(),
                shift.getEndTime(),
                shift.getLastReservationTime(),
                shift.getMaxCovers(),
                shift.getOverCapacityDayCount(),
                shift.getSlotDurationMinutes(),
                shift.getStatus(),
                shift.getCreatedAt(),
                shift.getUpdatedAt()
        );
    }
}
