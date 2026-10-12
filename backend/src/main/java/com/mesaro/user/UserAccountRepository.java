package com.mesaro.user;

import com.mesaro.billing.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    Optional<UserAccount> findByStripeCustomerId(String stripeCustomerId);

    List<UserAccount> findByBillingStatusAndTrialEndsAtBefore(SubscriptionStatus status, Instant cutoff);

    List<UserAccount> findByBillingStatusAndTrialEndsAtBetween(SubscriptionStatus status, Instant from, Instant to);

    List<UserAccount> findByStatusAndDeletedAtUtcBefore(UserAccountStatus status, Instant cutoff);
}
