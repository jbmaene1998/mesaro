package com.mesaro.staff;

import com.mesaro.security.RestaurantRole;

public record StaffInvitePreviewResponse(
        String restaurantName,
        RestaurantRole role,
        String email,
        boolean passwordRequired,
        boolean expired,
        boolean alreadyAccepted
) {
}
