package com.mesaro.dashboard;

import java.time.LocalTime;

/**
 * Current status of a shift.
 */
public record ShiftStatus(
        Long shiftId,
        String shiftName,
        LocalTime startTime,
        LocalTime endTime,
        int maxCovers,
        int currentCovers,
        int availableCovers,
        int reservationCount,
        double utilizationPercent,
        boolean isActive
) {
    public static ShiftStatus from(Long shiftId, String shiftName, LocalTime startTime, LocalTime endTime,
                                    int maxCovers, int currentCovers, int reservationCount, boolean isActive) {
        int available = Math.max(0, maxCovers - currentCovers);
        double utilization = maxCovers > 0 ? (currentCovers * 100.0 / maxCovers) : 0.0;

        return new ShiftStatus(
                shiftId,
                shiftName,
                startTime,
                endTime,
                maxCovers,
                currentCovers,
                available,
                reservationCount,
                Math.round(utilization * 10.0) / 10.0,
                isActive
        );
    }
}
