package com.mesaro.billing;

/**
 * Mirrors Stripe subscription status values plus Mesaro's own TRIALING state
 * (trial managed in-app without requiring a credit card upfront).
 */
public enum SubscriptionStatus {

    /** Within the 14-day free trial. No Stripe subscription exists yet. */
    TRIALING,

    /** Subscription active and paid. Full access. */
    ACTIVE,

    /** Payment failed; grace period applies before access is blocked. */
    PAST_DUE,

    /** Subscription explicitly cancelled; access blocked at period end. */
    CANCELED,

    /** Multiple successive payment failures; access blocked immediately. */
    UNPAID,

    /** Operator-initiated pause (reserved for future use). */
    PAUSED;

    /** Returns true if this status grants full platform access. */
    public boolean allowsAccess() {
        return this == TRIALING || this == ACTIVE || this == PAST_DUE;
    }
}
