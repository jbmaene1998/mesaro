package com.mesaro.billing;

import com.mesaro.common.ApiResponse;
import com.mesaro.security.AuthPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Owner-scoped checkout confirmation endpoint.
 * Used as a reliable fallback when webhook delivery is delayed.
 */
@RestController
@RequestMapping("/api/billing")
public class BillingCheckoutController {

    private final BillingService billingService;

    public BillingCheckoutController(BillingService billingService) {
        this.billingService = billingService;
    }

    @PostMapping("/checkout/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmCheckout(
            @RequestParam("session_id") String sessionId) {
        AuthPrincipal principal = getPrincipal();
        billingService.confirmCheckoutSession(principal.getUserId(), sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Checkout confirmed"));
    }

    private AuthPrincipal getPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }
}
