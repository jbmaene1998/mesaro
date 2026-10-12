package com.mesaro.planning;

import java.time.LocalDate;

public record RecurringAssignmentSkippedResponse(
        LocalDate serviceDate,
        String reason
) {
}
