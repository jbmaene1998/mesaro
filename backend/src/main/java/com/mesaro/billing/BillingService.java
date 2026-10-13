package com.mesaro.billing;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.common.exception.BillingAccessBlockedException;
import com.mesaro.infra.EmailService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantStatus;
import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Business logic for owner-scoped subscription lifecycle.
 * One Stripe customer and one Stripe subscription per owner.
 * Subscription quantity controls owner restaurant quota.
 */
@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);
    private static final Set<String> BILLABLE_STRIPE_SUBSCRIPTION_STATUSES = Set.of(
            "active",
            "past_due",
            "unpaid",
            "paused",
            "trialing"
    );

    /** Full platform access while PAST_DUE until this elapses from {@code user_account.past_due_since}. */
    static final Duration PAST_DUE_GRACE_PERIOD = Duration.ofDays(7);

    private final StripeService stripeService;
    private final UserRestaurantRepository userRestaurantRepository;
    private final UserAccountRepository userAccountRepository;
    private final EmailService emailService;
    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public BillingService(StripeService stripeService,
                          UserRestaurantRepository userRestaurantRepository,
                          UserAccountRepository userAccountRepository,
                          EmailService emailService,
                          JdbcTemplate jdbcTemplate,
                          AuditService auditService) {
        this.stripeService = stripeService;
        this.userRestaurantRepository = userRestaurantRepository;
        this.userAccountRepository = userAccountRepository;
        this.emailService = emailService;
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    // -------------------------------------------------------------------------
    // Access guard
    // -------------------------------------------------------------------------

    /**
     * Throws {@link BillingAccessBlockedException} (HTTP 402) if the owner's
     * billing status does not allow platform access.
     */
    @Transactional
    public void checkBillingAccess(Restaurant restaurant) {
        UserAccount owner = resolveOwnerForRestaurant(restaurant.getId());

        // Enforce owner trial expiry in real-time for guarded write operations.
        if (owner.getBillingStatus() == SubscriptionStatus.TRIALING
                && owner.getTrialEndsAt() != null
                && owner.getTrialEndsAt().isBefore(Instant.now())) {
            owner.setBillingStatus(SubscriptionStatus.CANCELED);
            userAccountRepository.save(owner);
            log.info("Trial expired in-request for owner {} — billing_status set to CANCELED", owner.getId());
        }

        if (!ownerAllowsBillingAccess(owner, Instant.now())) {
            throw new BillingAccessBlockedException(
                    "Your subscription has expired. Please subscribe to continue.",
                    owner.getBillingStatus().name()
            );
        }
    }

    // -------------------------------------------------------------------------
    // Billing status query
    // -------------------------------------------------------------------------

    public BillingStatusResponse getBillingStatus(Restaurant restaurant) {
        UserAccount owner = resolveOwnerForRestaurant(restaurant.getId());
        reconcileOwnerFromStripe(owner);
        return buildBillingStatus(owner);
    }

    /**
     * Updates the owner subscription quantity in Stripe and synchronizes local quota.
     */
    @Transactional
    public BillingStatusResponse updateSubscriptionQuantity(Restaurant restaurant, int targetQuantity) {
        if (targetQuantity < 1) {
            throw new ValidationException("Quantity must be at least 1", "quantity");
        }

        UserAccount owner = resolveOwnerForRestaurant(restaurant.getId());
        long activeOwnedRestaurants = countActiveOwnedRestaurants(owner.getId());
        long minimumAllowedQuantity = Math.max(1L, activeOwnedRestaurants);
        if (targetQuantity < minimumAllowedQuantity) {
            throw new ConflictException(
                    "Cannot set quantity below active restaurants (" + activeOwnedRestaurants + "). "
                            + "Archive restaurants first.",
                    "quantity");
        }

        if (owner.getStripeSubscriptionId() == null || owner.getStripeSubscriptionId().isBlank()) {
            reconcileOwnerFromStripe(owner);
        }
        if (owner.getStripeSubscriptionId() == null || owner.getStripeSubscriptionId().isBlank()) {
            throw new ConflictException("No active subscription found. Start checkout first.");
        }

        try {
            Subscription subscription = stripeService.updateSubscriptionQuantity(
                    owner.getStripeSubscriptionId(), targetQuantity);
            owner.setStripeSubscriptionId(subscription.getId());
            SubscriptionStatus newStatus = mapStripeStatus(subscription.getStatus());
            owner.setBillingStatus(newStatus);
            applyPastDueTimestampTransition(owner, newStatus, Instant.now());
            owner.setMaxRestaurants(Math.max(1, resolveSubscriptionQuantity(subscription)));
            if (owner.getBillingStatus() == SubscriptionStatus.ACTIVE && owner.getTrialEndsAt() != null) {
                owner.setTrialEndsAt(Instant.now());
            }
            userAccountRepository.save(owner);
            log.info("Owner {} subscription quantity updated to {}", owner.getId(), owner.getMaxRestaurants());
            return buildBillingStatus(owner);
        } catch (StripeException e) {
            throw new RuntimeException("Failed to update subscription quantity", e);
        }
    }

    // -------------------------------------------------------------------------
    // Checkout session creation (subscription sign-up)
    // -------------------------------------------------------------------------

    /**
     * Creates (or reuses) a Stripe Customer for the owner, then creates a
     * Checkout Session in subscription mode with quantity = active restaurant count.
     * <p>
     * Owners who already have a billable Stripe subscription must change capacity via
     * {@link #updateSubscriptionQuantity} — Checkout would create a second subscription.
     */
    @Transactional
    public String createCheckoutSession(Restaurant restaurant) {
        UserAccount owner = resolveOwnerForRestaurant(restaurant.getId());
        reconcileOwnerFromStripe(owner);
        if (hasBillableSubscription(owner)) {
            throw new ConflictException(
                    "An active subscription already exists. Increase restaurant capacity "
                            + "from Billing instead of starting a new checkout.",
                    "subscription");
        }
        try {
            String customerId = ensureStripeCustomer(owner, restaurant);
            long quantity = desiredSubscriptionQuantity(owner.getId());
            String idempotencyKey = "owner_checkout_" + owner.getId() + "_" + UUID.randomUUID();
            Session session = stripeService.createCheckoutSession(customerId, quantity, idempotencyKey);
            log.info("Created owner checkout session {} for owner {} quantity={}",
                    session.getId(), owner.getId(), quantity);
            auditService.record(
                    AuditEventType.BILLING_CHECKOUT_STARTED,
                    restaurant.getId(),
                    owner.getId(),
                    owner.getId(),
                    "BILLING",
                    Map.of("quantity", quantity)
            );
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Stripe error creating checkout session for owner {}: {}", owner.getId(), e.getMessage());
            throw new RuntimeException("Failed to create checkout session", e);
        }
    }

    // -------------------------------------------------------------------------
    // Customer Portal session
    // -------------------------------------------------------------------------

    /**
     * Creates a Stripe Billing Portal session for owner self-service management.
     */
    @Transactional
    public String createPortalSession(Restaurant restaurant) {
        UserAccount owner = resolveOwnerForRestaurant(restaurant.getId());
        if (owner.getStripeCustomerId() == null || owner.getStripeCustomerId().isBlank()) {
            throw new IllegalStateException("No Stripe customer found for owner " + owner.getId());
        }
        try {
            com.stripe.model.billingportal.Session session =
                    stripeService.createPortalSession(owner.getStripeCustomerId());
            log.info("Created Stripe portal session for owner {}", owner.getId());
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Stripe error creating portal session for owner {}: {}", owner.getId(), e.getMessage());
            throw new RuntimeException("Failed to create portal session", e);
        }
    }

    // -------------------------------------------------------------------------
    // Trial expiry enforcement (scheduled)
    // -------------------------------------------------------------------------

    /**
     * Runs daily (configurable via {@code app.billing.expiry-check-cron}):
     * expires overdue owner trials and sends owner reminder emails.
     */
    @Scheduled(cron = "${app.billing.expiry-check-cron:0 0 6 * * *}")
    @Transactional
    public void enforceTrialExpiry() {
        Instant now = Instant.now();
        expireOverdueTrials(now);
        sendTrialEndingReminders(now);
    }

    private void expireOverdueTrials(Instant now) {
        List<UserAccount> expired = userAccountRepository
                .findByBillingStatusAndTrialEndsAtBefore(SubscriptionStatus.TRIALING, now);
        for (UserAccount owner : expired) {
            owner.setBillingStatus(SubscriptionStatus.CANCELED);
            userAccountRepository.save(owner);
            log.info("Trial expired for owner {} — billing_status set to CANCELED", owner.getId());
            auditService.record(
                    AuditEventType.BILLING_TRIAL_EXPIRED,
                    null,
                    owner.getId(),
                    owner.getId(),
                    "BILLING",
                    Map.of("billingStatus", SubscriptionStatus.CANCELED.name())
            );
        }
    }

    private void sendTrialEndingReminders(Instant now) {
        Instant windowStart = now.plus(2, ChronoUnit.DAYS);
        Instant windowEnd = now.plus(3, ChronoUnit.DAYS);

        List<UserAccount> nearlyExpired = userAccountRepository
                .findByBillingStatusAndTrialEndsAtBetween(SubscriptionStatus.TRIALING, windowStart, windowEnd);
        for (UserAccount owner : nearlyExpired) {
            try {
                emailService.sendTrialEndingReminder(
                        owner.getEmail(),
                        owner.getFullName(),
                        owner.getTrialEndsAt());
                log.info("Sent trial ending reminder for owner {}", owner.getId());
            } catch (Exception e) {
                log.warn("Failed to send trial reminder for owner {}: {}", owner.getId(), e.getMessage());
            }
        }
    }

    // -------------------------------------------------------------------------
    // Webhook event handlers
    // -------------------------------------------------------------------------

    /**
     * Handles {@code checkout.session.completed}.
     * Stores owner subscription ID, marks ACTIVE, ends trial, and syncs quota.
     */
    @Transactional
    public void handleCheckoutSessionCompleted(Session session) {
        String customerId = session.getCustomer();
        String subscriptionId = session.getSubscription();

        Optional<UserAccount> ownerOpt = userAccountRepository.findByStripeCustomerId(customerId);
        if (ownerOpt.isEmpty()) {
            log.warn("checkout.session.completed: no owner found for Stripe customer {}", customerId);
            return;
        }
        UserAccount owner = ownerOpt.get();
        owner.setStripeSubscriptionId(subscriptionId);
        owner.setBillingStatus(SubscriptionStatus.ACTIVE);
        owner.setTrialEndsAt(Instant.now());
        owner.setPastDueSince(null);
        userAccountRepository.save(owner);
        log.info("Owner {} subscription activated: {}", owner.getId(), subscriptionId);
        auditService.record(
                AuditEventType.BILLING_SUBSCRIPTION_UPDATED,
                null,
                owner.getId(),
                owner.getId(),
                "BILLING",
                Map.of("billingStatus", SubscriptionStatus.ACTIVE.name(), "source", "checkout.session.completed")
        );

        syncOwnerQuotaFromStripe(owner, subscriptionId);
    }

    /**
     * Handles {@code customer.subscription.updated}.
     * Syncs owner status/subscription id and quota from Stripe.
     */
    @Transactional
    public void handleSubscriptionUpdated(Subscription subscription) {
        String customerId = subscription.getCustomer();

        Optional<UserAccount> ownerOpt = userAccountRepository.findByStripeCustomerId(customerId);
        if (ownerOpt.isEmpty()) {
            log.warn("customer.subscription.updated: no owner for customer {}", customerId);
            return;
        }

        UserAccount owner = ownerOpt.get();
        SubscriptionStatus newStatus = mapStripeStatus(subscription.getStatus());
        owner.setBillingStatus(newStatus);
        owner.setStripeSubscriptionId(subscription.getId());
        applyPastDueTimestampTransition(owner, newStatus, Instant.now());
        if (newStatus == SubscriptionStatus.ACTIVE && owner.getTrialEndsAt() != null) {
            owner.setTrialEndsAt(Instant.now());
        }
        userAccountRepository.save(owner);
        log.info("Owner {} subscription status -> {} (sub={})", owner.getId(), newStatus, subscription.getId());
        auditService.record(
                AuditEventType.BILLING_SUBSCRIPTION_UPDATED,
                null,
                owner.getId(),
                owner.getId(),
                "BILLING",
                Map.of("billingStatus", newStatus.name(), "source", "customer.subscription.updated")
        );

        syncOwnerQuotaFromStripe(owner, subscription.getId());
    }

    /**
     * Handles {@code customer.subscription.deleted}.
     * Marks owner CANCELED, clears subscription ID, and sets base quota.
     */
    @Transactional
    public void handleSubscriptionDeleted(Subscription subscription) {
        String customerId = subscription.getCustomer();

        Optional<UserAccount> ownerOpt = userAccountRepository.findByStripeCustomerId(customerId);
        if (ownerOpt.isEmpty()) {
            log.warn("customer.subscription.deleted: no owner for customer {}", customerId);
            return;
        }

        UserAccount owner = ownerOpt.get();
        owner.setBillingStatus(SubscriptionStatus.CANCELED);
        owner.setStripeSubscriptionId(null);
        owner.setMaxRestaurants(1);
        userAccountRepository.save(owner);
        log.info("Owner {} subscription canceled; quota reset to 1", owner.getId());
        auditService.record(
                AuditEventType.BILLING_SUBSCRIPTION_DELETED,
                null,
                owner.getId(),
                owner.getId(),
                "BILLING",
                Map.of("billingStatus", SubscriptionStatus.CANCELED.name())
        );
    }

    /**
     * Handles {@code invoice.payment_failed}.
     */
    @Transactional
    public void handleInvoicePaymentFailed(Invoice invoice) {
        String customerId = invoice.getCustomer();

        Optional<UserAccount> ownerOpt = userAccountRepository.findByStripeCustomerId(customerId);
        if (ownerOpt.isEmpty()) {
            log.warn("invoice.payment_failed: no owner for customer {}", customerId);
            return;
        }

        UserAccount owner = ownerOpt.get();
        Instant now = Instant.now();
        owner.setBillingStatus(SubscriptionStatus.PAST_DUE);
        if (owner.getPastDueSince() == null) {
            owner.setPastDueSince(now);
        }
        userAccountRepository.save(owner);
        log.warn("Owner {} payment failed — billing_status set to PAST_DUE", owner.getId());
        auditService.record(
                AuditEventType.BILLING_INVOICE_FAILED,
                null,
                owner.getId(),
                owner.getId(),
                "BILLING",
                Map.of("billingStatus", SubscriptionStatus.PAST_DUE.name())
        );
    }

    /**
     * Handles {@code invoice.payment_succeeded}.
     */
    @Transactional
    public void handleInvoicePaymentSucceeded(Invoice invoice) {
        String customerId = invoice.getCustomer();
        if ("subscription_create".equals(invoice.getBillingReason())) {
            return;
        }
        Optional<UserAccount> ownerOpt = userAccountRepository.findByStripeCustomerId(customerId);
        if (ownerOpt.isEmpty()) {
            return;
        }

        UserAccount owner = ownerOpt.get();
        if (owner.getBillingStatus() == SubscriptionStatus.PAST_DUE
                || owner.getBillingStatus() == SubscriptionStatus.UNPAID) {
            owner.setBillingStatus(SubscriptionStatus.ACTIVE);
            owner.setPastDueSince(null);
            userAccountRepository.save(owner);
            log.info("Owner {} payment recovered — billing_status set to ACTIVE", owner.getId());
            auditService.record(
                    AuditEventType.BILLING_INVOICE_PAID,
                    null,
                    owner.getId(),
                    owner.getId(),
                    "BILLING",
                    Map.of("billingStatus", SubscriptionStatus.ACTIVE.name())
            );
        }
    }

    // -------------------------------------------------------------------------
    // Idempotency helpers
    // -------------------------------------------------------------------------

    /**
     * Atomically claim a Stripe event for processing.
     * Returns true when this node should handle the event (new claim, or reclaim of
     * {@code failed} / stale {@code processing} rows so Stripe retries work).
     * Returns false when the event is already {@code done} or actively {@code processing}.
     */
    @Transactional
    public boolean tryClaimEvent(String eventId, String eventType) {
        int inserted = jdbcTemplate.update(
                "INSERT INTO stripe_webhook_event(event_id, event_type, status, processed_at) " +
                        "VALUES (?, ?, 'processing', now()) ON CONFLICT (event_id) DO NOTHING",
                eventId, eventType
        );
        if (inserted == 1) {
            return true;
        }

        int reclaimed = jdbcTemplate.update(
                "UPDATE stripe_webhook_event " +
                        "SET status = 'processing', event_type = ?, processed_at = now() " +
                        "WHERE event_id = ? AND (" +
                        "  status = 'failed' OR " +
                        "  (status = 'processing' AND processed_at < now() - interval '5 minutes')" +
                        ")",
                eventType, eventId
        );
        return reclaimed == 1;
    }

    /**
     * @deprecated Prefer {@link #tryClaimEvent(String, String)} + {@link #markEventDone(String)}.
     */
    @Deprecated
    @Transactional
    public boolean tryMarkProcessed(String eventId, String eventType) {
        return tryClaimEvent(eventId, eventType);
    }

    @Transactional
    public void markEventDone(String eventId) {
        jdbcTemplate.update(
                "UPDATE stripe_webhook_event SET status = 'done', processed_at = now() WHERE event_id = ?",
                eventId
        );
    }

    @Transactional
    public void markEventFailed(String eventId) {
        jdbcTemplate.update(
                "UPDATE stripe_webhook_event SET status = 'failed', processed_at = now() WHERE event_id = ?",
                eventId
        );
    }

    /**
     * Fallback confirmation path for checkout success redirects.
     * This allows the UI to activate billing immediately even if webhook delivery
     * is delayed.
     */
    @Transactional
    public void confirmCheckoutSession(Long ownerUserId, String sessionId) {
        if (ownerUserId == null || sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("ownerUserId and sessionId are required");
        }

        UserAccount owner = userAccountRepository.findById(ownerUserId)
                .orElseThrow(() -> new IllegalStateException("Owner not found: " + ownerUserId));

        try {
            Session session = stripeService.retrieveCheckoutSession(sessionId);
            String customerId = session.getCustomer();
            if (customerId == null || customerId.isBlank()) {
                throw new IllegalStateException("Checkout session has no customer");
            }

            if (owner.getStripeCustomerId() != null && !owner.getStripeCustomerId().equals(customerId)) {
                throw new IllegalStateException("Checkout session does not belong to authenticated owner");
            }
            if (owner.getStripeCustomerId() == null) {
                owner.setStripeCustomerId(customerId);
                userAccountRepository.save(owner);
            }

            if (session.getSubscription() == null || session.getSubscription().isBlank()) {
                // Fallback: reconcile via customer subscriptions if Stripe did not
                // populate the subscription field on this session retrieval.
                reconcileOwnerFromStripe(owner);
                if (owner.getStripeSubscriptionId() == null || owner.getStripeSubscriptionId().isBlank()) {
                    throw new IllegalStateException("Checkout session is not completed yet");
                }
                return;
            }

            handleCheckoutSessionCompleted(session);
        } catch (StripeException e) {
            throw new RuntimeException("Failed to confirm checkout session", e);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private UserAccount resolveOwnerForRestaurant(Long restaurantId) {
        List<UserRestaurant> owners = userRestaurantRepository
                .findByRestaurantIdAndRoleWithUser(restaurantId, RestaurantRole.OWNER);
        if (owners.isEmpty() || owners.get(0).getUser() == null) {
            throw new IllegalStateException("No owner found for restaurant " + restaurantId);
        }
        return owners.get(0).getUser();
    }

    private String ensureStripeCustomer(UserAccount owner, Restaurant restaurant) throws StripeException {
        if (owner.getStripeCustomerId() != null && !owner.getStripeCustomerId().isBlank()) {
            return owner.getStripeCustomerId();
        }

        String ownerEmail = owner.getEmail() != null ? owner.getEmail() : "unknown@mesaro.com";
        String ownerName = owner.getFullName() != null && !owner.getFullName().isBlank()
                ? owner.getFullName()
                : ownerEmail;

        Customer customer = stripeService.createCustomer(ownerEmail, ownerName, restaurant.getId());
        owner.setStripeCustomerId(customer.getId());
        userAccountRepository.save(owner);
        log.info("Created Stripe customer {} for owner {}", customer.getId(), owner.getId());
        return customer.getId();
    }

    private long desiredSubscriptionQuantity(Long ownerUserId) {
        long activeOwned = countActiveOwnedRestaurants(ownerUserId);
        return Math.max(1L, activeOwned);
    }

    private long countActiveOwnedRestaurants(Long ownerUserId) {
        long activeOwned = userRestaurantRepository.countByUser_IdAndRoleAndRestaurant_Status(
                ownerUserId, RestaurantRole.OWNER, RestaurantStatus.ACTIVE);
        return Math.max(0L, activeOwned);
    }

    private BillingStatusResponse buildBillingStatus(UserAccount owner) {
        int activeRestaurantCount = (int) Math.min(Integer.MAX_VALUE, countActiveOwnedRestaurants(owner.getId()));
        return new BillingStatusResponse(
                owner.getBillingStatus(),
                owner.getTrialEndsAt(),
                owner.getStripeCustomerId(),
                owner.getStripeSubscriptionId(),
                ownerAllowsBillingAccess(owner, Instant.now()),
                Math.max(1, owner.getMaxRestaurants()),
                activeRestaurantCount
        );
    }

    private void reconcileOwnerFromStripe(UserAccount owner) {
        if (owner.getStripeCustomerId() == null || owner.getStripeCustomerId().isBlank()) {
            return;
        }
        try {
            Subscription subscription = resolveCurrentOwnerSubscription(owner);
            if (subscription == null) {
                return;
            }

            owner.setStripeSubscriptionId(subscription.getId());
            SubscriptionStatus reconciledStatus = mapStripeStatus(subscription.getStatus());
            owner.setBillingStatus(reconciledStatus);
            applyPastDueTimestampTransition(owner, reconciledStatus, Instant.now());
            if (owner.getBillingStatus() == SubscriptionStatus.ACTIVE && owner.getTrialEndsAt() != null) {
                owner.setTrialEndsAt(Instant.now());
            }
            owner.setMaxRestaurants(Math.max(1, resolveSubscriptionQuantity(subscription)));
            userAccountRepository.save(owner);
        } catch (StripeException e) {
            log.warn("Failed to reconcile owner {} billing from Stripe: {}", owner.getId(), e.getMessage());
        }
    }

    /**
     * Whether the owner may use guest booking and other billing-guarded features.
     * PAST_DUE keeps access for {@link #PAST_DUE_GRACE_PERIOD} from {@code past_due_since}.
     */
    boolean ownerAllowsBillingAccess(UserAccount owner, Instant now) {
        SubscriptionStatus status = owner.getBillingStatus();
        if (!status.allowsAccess()) {
            return false;
        }
        if (status != SubscriptionStatus.PAST_DUE) {
            return true;
        }
        Instant pastDueSince = owner.getPastDueSince();
        if (pastDueSince == null) {
            return true;
        }
        return now.isBefore(pastDueSince.plus(PAST_DUE_GRACE_PERIOD));
    }

    private void applyPastDueTimestampTransition(UserAccount owner, SubscriptionStatus newStatus, Instant now) {
        if (newStatus == SubscriptionStatus.ACTIVE || newStatus == SubscriptionStatus.TRIALING) {
            owner.setPastDueSince(null);
        } else if (newStatus == SubscriptionStatus.PAST_DUE && owner.getPastDueSince() == null) {
            owner.setPastDueSince(now);
        }
    }

    private Subscription resolveCurrentOwnerSubscription(UserAccount owner) throws StripeException {
        if (owner.getStripeSubscriptionId() != null && !owner.getStripeSubscriptionId().isBlank()) {
            return stripeService.retrieveSubscription(owner.getStripeSubscriptionId());
        }
        List<Subscription> subscriptions = stripeService.listSubscriptionsForCustomer(owner.getStripeCustomerId());
        if (subscriptions == null || subscriptions.isEmpty()) {
            return null;
        }
        for (Subscription subscription : subscriptions) {
            if (isBillableStripeStatus(subscription.getStatus())) {
                return subscription;
            }
        }
        return subscriptions.get(0);
    }

    private void syncOwnerQuotaFromStripe(UserAccount owner, String subscriptionId) {
        if (subscriptionId == null || subscriptionId.isBlank()) {
            owner.setMaxRestaurants(1);
            userAccountRepository.save(owner);
            return;
        }
        try {
            Subscription snapshot = stripeService.retrieveSubscription(subscriptionId);
            if (snapshot == null || !isBillableStripeStatus(snapshot.getStatus())) {
                owner.setMaxRestaurants(1);
            } else {
                owner.setMaxRestaurants(Math.max(1, resolveSubscriptionQuantity(snapshot)));
            }
            userAccountRepository.save(owner);
            log.info("Owner {} quota synced to {} from subscription {}", owner.getId(),
                    owner.getMaxRestaurants(), subscriptionId);
        } catch (StripeException e) {
            throw new RuntimeException(
                    "Failed to reconcile owner quota from Stripe subscription " + subscriptionId, e);
        }
    }

    private boolean isBillableStripeStatus(String status) {
        if (status == null) {
            return false;
        }
        return BILLABLE_STRIPE_SUBSCRIPTION_STATUSES.contains(status.toLowerCase());
    }

    /** True when the owner already has a live Stripe subscription that should be quantity-updated. */
    private boolean hasBillableSubscription(UserAccount owner) {
        if (owner.getStripeSubscriptionId() == null || owner.getStripeSubscriptionId().isBlank()) {
            return false;
        }
        SubscriptionStatus status = owner.getBillingStatus();
        return status == SubscriptionStatus.ACTIVE
                || status == SubscriptionStatus.PAST_DUE
                || status == SubscriptionStatus.UNPAID
                || status == SubscriptionStatus.PAUSED
                || status == SubscriptionStatus.TRIALING;
    }

    private int resolveSubscriptionQuantity(Subscription subscription) {
        if (subscription.getItems() == null || subscription.getItems().getData() == null
                || subscription.getItems().getData().isEmpty()) {
            return 1;
        }
        Long quantity = subscription.getItems().getData().get(0).getQuantity();
        if (quantity == null || quantity < 1) {
            return 1;
        }
        return quantity > Integer.MAX_VALUE ? Integer.MAX_VALUE : quantity.intValue();
    }

    private SubscriptionStatus mapStripeStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "active" -> SubscriptionStatus.ACTIVE;
            case "trialing" -> SubscriptionStatus.TRIALING;
            case "past_due" -> SubscriptionStatus.PAST_DUE;
            case "canceled" -> SubscriptionStatus.CANCELED;
            case "unpaid" -> SubscriptionStatus.UNPAID;
            case "paused" -> SubscriptionStatus.PAUSED;
            default -> {
                log.warn("Unrecognised Stripe subscription status: {}", stripeStatus);
                yield SubscriptionStatus.PAST_DUE;
            }
        };
    }
}
