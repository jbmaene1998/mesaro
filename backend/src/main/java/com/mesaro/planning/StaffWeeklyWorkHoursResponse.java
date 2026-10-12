package com.mesaro.planning;

import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserRestaurant;

import java.math.BigDecimal;

public record StaffWeeklyWorkHoursResponse(
        Long userId,
        String email,
        String fullName,
        RestaurantRole role,
        BigDecimal plannedHours
) {
    public static StaffWeeklyWorkHoursResponse fromMembership(UserRestaurant membership, BigDecimal plannedHours) {
        return new StaffWeeklyWorkHoursResponse(
                membership.getUser().getId(),
                membership.getUser().getEmail(),
                membership.getUser().getFullName(),
                membership.getRole(),
                plannedHours
        );
    }
}
