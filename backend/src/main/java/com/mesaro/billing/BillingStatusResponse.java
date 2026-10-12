package com.mesaro.billing;

import java.time.Instant;

public record BillingStatusResponse(
        SubscriptionStatus status,
        Instant trialEndsAt,
        String stripeCustomerId,
        String stripeSubscriptionId,
        boolean accessAllowed,
        int currentQuantity,
        int activeRestaurantCount
) {}
