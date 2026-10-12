package com.mesaro.auth;

import java.util.List;

public record CurrentUserResponse(
        Long id,
        String email,
        String fullName,
        String phone,
        List<AuthRestaurantSummary> restaurants,
        int maxRestaurants
) {
}
