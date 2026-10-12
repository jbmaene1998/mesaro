package com.mesaro.billing;

import com.mesaro.common.ApiResponse;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * REST endpoints for owner-scoped billing management.
 * Endpoints are addressed via a restaurant context, but the underlying Stripe
 * customer/subscription is shared across all restaurants of the same owner.
 *
 * <pre>
 * GET  /api/restaurants/{id}/billing/status            → current billing status
 * POST /api/restaurants/{id}/billing/checkout-session  → create Stripe Checkout URL
 * POST /api/restaurants/{id}/billing/portal-session    → create Stripe Billing Portal URL
 * </pre>
 */
@RestController
@RequestMapping("/api/restaurants/{id}/billing")
public class BillingController {

    private final BillingService billingService;
    private final RestaurantRepository restaurantRepository;

    public BillingController(BillingService billingService,
                             RestaurantRepository restaurantRepository) {
        this.billingService = billingService;
        this.restaurantRepository = restaurantRepository;
    }

    // -------------------------------------------------------------------------
    // GET /api/restaurants/{id}/billing/status
    // -------------------------------------------------------------------------

    @GetMapping("/status")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'OWNER')")
    public ResponseEntity<ApiResponse<BillingStatusResponse>> getStatus(
            @PathVariable Long id) {
        Restaurant restaurant = loadRestaurant(id);
        return ResponseEntity.ok(ApiResponse.success(billingService.getBillingStatus(restaurant)));
    }

    // -------------------------------------------------------------------------
    // POST /api/restaurants/{id}/billing/checkout-session
    // -------------------------------------------------------------------------

    /**
     * Creates a Stripe Checkout Session for the specified restaurant.
     * The frontend should redirect the browser to the returned URL.
     */
    @PostMapping("/checkout-session")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'OWNER')")
    public ResponseEntity<ApiResponse<CheckoutSessionResponse>> createCheckoutSession(
            @PathVariable Long id) {
        Restaurant restaurant = loadRestaurant(id);
        String url = billingService.createCheckoutSession(restaurant);
        return ResponseEntity.ok(ApiResponse.success(new CheckoutSessionResponse(url)));
    }

    // -------------------------------------------------------------------------
    // POST /api/restaurants/{id}/billing/portal-session
    // -------------------------------------------------------------------------

    /**
     * Creates a Stripe Billing Portal session for managing an existing
     * subscription for the specified restaurant.
     */
    @PostMapping("/portal-session")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'OWNER')")
    public ResponseEntity<ApiResponse<PortalSessionResponse>> createPortalSession(
            @PathVariable Long id) {
        Restaurant restaurant = loadRestaurant(id);
        String url = billingService.createPortalSession(restaurant);
        return ResponseEntity.ok(ApiResponse.success(new PortalSessionResponse(url)));
    }

    // -------------------------------------------------------------------------
    // POST /api/restaurants/{id}/billing/quantity
    // -------------------------------------------------------------------------

    @PostMapping("/quantity")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'OWNER')")
    public ResponseEntity<ApiResponse<BillingStatusResponse>> updateQuantity(
            @PathVariable Long id,
            @Valid @RequestBody BillingQuantityUpdateRequest request) {
        Restaurant restaurant = loadRestaurant(id);
        BillingStatusResponse status = billingService.updateSubscriptionQuantity(restaurant, request.quantity());
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Restaurant loadRestaurant(Long id) {
        return restaurantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Restaurant not found"));
    }
}
