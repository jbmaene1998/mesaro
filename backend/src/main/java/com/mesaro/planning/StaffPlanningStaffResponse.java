package com.mesaro.planning;

import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserRestaurant;

public record StaffPlanningStaffResponse(
        Long userId,
        String email,
        String fullName,
        RestaurantRole role
) {
    public static StaffPlanningStaffResponse fromMembership(UserRestaurant membership) {
        return new StaffPlanningStaffResponse(
                membership.getUser().getId(),
                membership.getUser().getEmail(),
                membership.getUser().getFullName(),
                membership.getRole()
        );
    }
}
