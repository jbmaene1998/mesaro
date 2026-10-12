package com.mesaro.auth;

import com.mesaro.security.RestaurantRole;

public record AuthRestaurantSummary(Long restaurantId, RestaurantRole role) {
}
