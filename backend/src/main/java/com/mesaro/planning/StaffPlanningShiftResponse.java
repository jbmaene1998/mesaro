package com.mesaro.planning;

import com.mesaro.shift.ShiftStatus;

import java.util.List;

public record StaffPlanningShiftResponse(
        Long shiftId,
        String shiftName,
        String startTime,
        String endTime,
        ShiftStatus status,
        List<StaffShiftAssignmentResponse> assignedStaff,
        List<StaffPlanningStaffResponse> availableStaff,
        List<StaffPlanningUnavailableStaffResponse> unavailableStaff
) {
}
