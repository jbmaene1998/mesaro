package com.mesaro.restaurant;

import com.mesaro.security.RestaurantRole;

public record RestaurantContextResponse(
        Long userId,
        String email,
        Long restaurantId,
        RestaurantRole role
) {
}
