package com.mesaro.security;

import com.mesaro.billing.BillingService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.user.UserRestaurantRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;
import java.util.Optional;

@Component
public class RestaurantContextInterceptor implements HandlerInterceptor {

    public static final String RESTAURANT_HEADER = "X-Restaurant-Id";

    private final UserRestaurantRepository userRestaurantRepository;
    private final RestaurantRepository restaurantRepository;
    private final BillingService billingService;

    public RestaurantContextInterceptor(UserRestaurantRepository userRestaurantRepository,
                                        RestaurantRepository restaurantRepository,
                                        BillingService billingService) {
        this.userRestaurantRepository = userRestaurantRepository;
        this.restaurantRepository = restaurantRepository;
        this.billingService = billingService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return true;
        }

        if (!(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            return true;
        }

        Long headerRestaurantId = parseRestaurantId(request.getHeader(RESTAURANT_HEADER));
        Long pathRestaurantId = resolvePathRestaurantId(request);
        Long queryRestaurantId = parseRestaurantId(request.getParameter("restaurantId"));

        Long resolvedRestaurantId = resolveSingleRestaurantId(
                headerRestaurantId, pathRestaurantId, queryRestaurantId);
        if (resolvedRestaurantId != null) {
            RestaurantRole role = resolveRole(principal, resolvedRestaurantId);
            if (role == null) {
                throw new AccessDeniedException("No access to restaurant");
            }
            RestaurantContextHolder.set(new RestaurantContext(resolvedRestaurantId, role));

            // Gate all restaurant-scoped write operations behind billing status.
            // Skip the check for the billing endpoints themselves so owners can
            // always reach the checkout/portal session to reactivate.
            // Wrap in try-catch so the context is cleared if the check throws
            // (afterCompletion is not called when preHandle throws).
            if (!isBillingPath(request) && !isReadOnlyMethod(request)) {
                try {
                    Optional<Restaurant> restaurantOpt = restaurantRepository.findById(resolvedRestaurantId);
                    restaurantOpt.ifPresent(billingService::checkBillingAccess);
                } catch (RuntimeException ex) {
                    RestaurantContextHolder.clear();
                    throw ex;
                }
            }
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        RestaurantContextHolder.clear();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Returns true for requests targeting the billing sub-resource
     * ({@code /restaurants/{id}/billing/**}). These are never blocked by billing
     * status so that an OWNER can always reach the checkout/portal to reactivate.
     */
    private boolean isBillingPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri != null && uri.contains("/billing");
    }

    /**
     * Returns true for HTTP GET / HEAD / OPTIONS — read-only requests are not
     * blocked by billing status so operators can still view their data.
     */
    private boolean isReadOnlyMethod(HttpServletRequest request) {
        String method = request.getMethod();
        return "GET".equalsIgnoreCase(method)
                || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method);
    }

    /**
     * Header, path, and {@code restaurantId} query param must agree.
     * Admin reservation routes pass the restaurant only as a query param;
     * ignoring that let a client skip the billing gate by omitting {@code X-Restaurant-Id}.
     */
    private Long resolveSingleRestaurantId(Long headerRestaurantId, Long pathRestaurantId, Long queryRestaurantId) {
        Long resolved = null;
        for (Long candidate : new Long[] {headerRestaurantId, pathRestaurantId, queryRestaurantId}) {
            if (candidate == null) {
                continue;
            }
            if (resolved == null) {
                resolved = candidate;
                continue;
            }
            if (!resolved.equals(candidate)) {
                throw new ConflictException("Restaurant context mismatch between header, path, and query");
            }
        }
        return resolved;
    }

    private Long resolvePathRestaurantId(HttpServletRequest request) {
        Object vars = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (vars instanceof Map<?, ?> map) {
            Object explicitRestaurantId = map.get("restaurantId");
            if (explicitRestaurantId != null) {
                return parseRestaurantId(explicitRestaurantId.toString());
            }

            // Backward compatibility for routes using {id} as restaurant id.
            // Only treat generic {id} as restaurant context on /restaurants/{id}/... paths.
            String requestUri = request.getRequestURI();
            if (requestUri != null && requestUri.contains("/restaurants/")) {
                Object idValue = map.get("id");
                return parseRestaurantId(idValue != null ? idValue.toString() : null);
            }
        }
        return null;
    }

    private Long parseRestaurantId(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private RestaurantRole resolveRole(AuthPrincipal principal, Long restaurantId) {
        if (principal == null || principal.getUserId() == null) {
            return null;
        }
        return userRestaurantRepository.findEffectiveRole(principal.getUserId(), restaurantId).orElse(null);
    }
}
