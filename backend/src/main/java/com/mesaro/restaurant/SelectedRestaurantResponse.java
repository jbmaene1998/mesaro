package com.mesaro.restaurant;

import com.mesaro.security.RestaurantRole;

public record SelectedRestaurantResponse(
        String accessToken,
        long expiresIn,
        Long restaurantId,
        RestaurantRole role
) {
}
