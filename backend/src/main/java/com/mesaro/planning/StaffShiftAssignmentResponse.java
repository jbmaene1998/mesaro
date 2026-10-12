package com.mesaro.planning;

import com.mesaro.security.RestaurantRole;

public record StaffShiftAssignmentResponse(
        Long assignmentId,
        Long userId,
        String email,
        String fullName,
        RestaurantRole role,
        String startTime,
        String endTime
) {
    public static StaffShiftAssignmentResponse fromEntity(StaffShiftAssignment assignment, RestaurantRole role) {
        return new StaffShiftAssignmentResponse(
                assignment.getId(),
                assignment.getUser().getId(),
                assignment.getUser().getEmail(),
                assignment.getUser().getFullName(),
                role,
                assignment.getPlannedStartLocalTime().toString(),
                assignment.getPlannedEndLocalTime().toString()
        );
    }
}
