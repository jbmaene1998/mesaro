package com.mesaro.planning;

import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserRestaurant;

public record StaffPlanningUnavailableStaffResponse(
        Long userId,
        String email,
        String fullName,
        RestaurantRole role,
        String reason
) {
    public static StaffPlanningUnavailableStaffResponse fromMembership(UserRestaurant membership, String reason) {
        return new StaffPlanningUnavailableStaffResponse(
                membership.getUser().getId(),
                membership.getUser().getEmail(),
                membership.getUser().getFullName(),
                membership.getRole(),
                reason
        );
    }
}
