package com.mesaro.security;

public enum RestaurantRole {
    OWNER(3),
    MANAGER(2),
    STAFF(1);

    private final int rank;

    RestaurantRole(int rank) {
        this.rank = rank;
    }

    public boolean atLeast(RestaurantRole required) {
        return this.rank >= required.rank;
    }

    public static RestaurantRole fromString(String value) {
        if (value == null) {
            return null;
        }
        try {
            return RestaurantRole.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
