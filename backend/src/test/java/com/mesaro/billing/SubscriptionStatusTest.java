package com.mesaro.billing;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SubscriptionStatusTest {

    @Test
    void allowsAccess_trueForTrialing() {
        assertThat(SubscriptionStatus.TRIALING.allowsAccess()).isTrue();
    }

    @Test
    void allowsAccess_trueForActive() {
        assertThat(SubscriptionStatus.ACTIVE.allowsAccess()).isTrue();
    }

    @Test
    void allowsAccess_trueForPastDue() {
        assertThat(SubscriptionStatus.PAST_DUE.allowsAccess()).isTrue();
    }

    @Test
    void allowsAccess_falseForCanceled() {
        assertThat(SubscriptionStatus.CANCELED.allowsAccess()).isFalse();
    }

    @Test
    void allowsAccess_falseForUnpaid() {
        assertThat(SubscriptionStatus.UNPAID.allowsAccess()).isFalse();
    }

    @Test
    void allowsAccess_falseForPaused() {
        assertThat(SubscriptionStatus.PAUSED.allowsAccess()).isFalse();
    }
}
