package com.mesaro.planning;

import java.time.LocalDate;
import java.util.List;

public record StaffPlanningResponse(
        Long restaurantId,
        LocalDate serviceDate,
        boolean restaurantClosed,
        String closureReason,
        List<StaffPlanningShiftResponse> shifts
) {
}
