package com.mesaro.security;

import com.mesaro.auth.AuthRestaurantSummary;

import java.util.List;

public class AuthPrincipal implements RestaurantAccessPrincipal {

    private final Long userId;
    private final String email;
    private final List<AuthRestaurantSummary> restaurants;
    private final List<RestaurantRoleAssignment> restaurantRoles;

    public AuthPrincipal(Long userId, String email, List<AuthRestaurantSummary> restaurants,
                         List<RestaurantRoleAssignment> restaurantRoles) {
        this.userId = userId;
        this.email = email;
        this.restaurants = restaurants;
        this.restaurantRoles = restaurantRoles;
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public List<AuthRestaurantSummary> getRestaurants() {
        return restaurants;
    }

    @Override
    public List<RestaurantRoleAssignment> getRestaurantRoles() {
        return restaurantRoles;
    }
}
