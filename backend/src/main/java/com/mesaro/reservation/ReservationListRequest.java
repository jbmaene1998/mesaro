package com.mesaro.reservation;

import java.time.LocalDate;
import java.util.List;

public record ReservationListRequest(
        LocalDate date,
        LocalDate startDate,
        LocalDate endDate,
        List<ReservationStatus> statuses
) {
    public ReservationListRequest {
        if (statuses == null || statuses.isEmpty()) {
            statuses = List.of(ReservationStatus.CONFIRMED, ReservationStatus.SEATED);
        }
    }
}
