package com.mesaro.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import com.mesaro.user.UserRestaurantRepository;

import java.util.Map;

@Component("restaurantAccessGuard")
public class RestaurantAccessGuard {

    private final UserRestaurantRepository userRestaurantRepository;

    public RestaurantAccessGuard(UserRestaurantRepository userRestaurantRepository) {
        this.userRestaurantRepository = userRestaurantRepository;
    }

    public boolean hasAtLeastRole(Long restaurantId, String requiredRole) {
        if (restaurantId == null) {
            return false;
        }
        RestaurantRole required = RestaurantRole.fromString(requiredRole);
        if (required == null) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return false;
        }

        Long userId = extractUserId(authentication);
        if (userId == null) {
            return false;
        }

        return userRestaurantRepository.findEffectiveRole(userId, restaurantId)
                .map(role -> role != null && role.atLeast(required))
                .orElse(false);
    }

    private Long extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthPrincipal authPrincipal) {
            return authPrincipal.getUserId();
        }

        if (principal instanceof Map<?, ?> map) {
            return toLong(map.get("userId"));
        }
        return null;
    }

    private Long toLong(Object value) {
        if (value instanceof Long longValue) {
            return longValue;
        }
        if (value instanceof Integer intValue) {
            return intValue.longValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Long.parseLong(stringValue);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

}
