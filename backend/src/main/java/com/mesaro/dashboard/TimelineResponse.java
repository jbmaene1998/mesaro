package com.mesaro.dashboard;

import java.time.LocalDate;
import java.util.List;

public record TimelineResponse(
        Long restaurantId,
        String restaurantName,
        String timezone,
        LocalDate date,
        List<TimelineTable> tables,
        List<TimelineReservation> reservations
) {
}
