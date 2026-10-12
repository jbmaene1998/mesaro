package com.mesaro.planning;

import java.time.LocalDate;
import java.util.List;

public record AssignStaffRecurringWeekResponse(
        Long userId,
        Long referenceShiftId,
        LocalDate weekStartDate,
        int assignedCount,
        List<LocalDate> assignedDates,
        List<RecurringAssignmentSkippedResponse> skipped
) {
}
