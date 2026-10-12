package com.mesaro.security;

import com.mesaro.common.exception.ValidationException;

import java.util.Optional;

public final class RestaurantContextHolder {

    private static final ThreadLocal<RestaurantContext> CONTEXT = new ThreadLocal<>();

    private RestaurantContextHolder() {
    }

    public static void set(RestaurantContext context) {
        CONTEXT.set(context);
    }

    public static Optional<RestaurantContext> get() {
        return Optional.ofNullable(CONTEXT.get());
    }

    public static RestaurantContext require() {
        RestaurantContext context = CONTEXT.get();
        if (context == null || context.restaurantId() == null) {
            throw new ValidationException("Restaurant context is required", "restaurantId");
        }
        return context;
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
