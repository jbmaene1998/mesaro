package com.mesaro.billing;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.CustomerUpdateParams;
import com.stripe.param.SubscriptionCancelParams;
import com.stripe.param.SubscriptionListParams;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Thin wrapper around the Stripe Java SDK.
 * <p>
 * All methods throw {@link StripeException} — callers (typically
 * {@link BillingService}) are responsible for translating these into
 * application-level errors.
 * </p>
 * <p>
 * The Stripe secret key is configured once via {@link PostConstruct}; all
 * subsequent API calls use it automatically.
 * </p>
 */
@Service
public class StripeService {

    private static final Logger log = LoggerFactory.getLogger(StripeService.class);

    private final StripeProperties properties;

    public StripeService(StripeProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        Stripe.apiKey = properties.getSecretKey();
        log.info("Stripe SDK initialised (live-mode={})",
                properties.getSecretKey().startsWith("sk_live_"));
    }

    // -------------------------------------------------------------------------
    // Customer
    // -------------------------------------------------------------------------

    /**
     * Creates a new Stripe Customer for an owner account.
     * Metadata keeps the first restaurant id for support tracing; billing is owner-scoped.
     */
    public Customer createCustomer(String email, String name, Long restaurantId) throws StripeException {
        CustomerCreateParams params = CustomerCreateParams.builder()
                .setEmail(email)
                .setName(name)
                .putMetadata("mesaro_restaurant_id", String.valueOf(restaurantId))
                .putMetadata("mesaro_product", "Mesaro")
                .build();
        return Customer.create(params);
    }

    /**
     * Syncs the customer's email in Stripe (e.g. after a profile update).
     */
    public void updateCustomerEmail(String stripeCustomerId, String newEmail) throws StripeException {
        Customer customer = Customer.retrieve(stripeCustomerId);
        customer.update(CustomerUpdateParams.builder().setEmail(newEmail).build());
    }

    // -------------------------------------------------------------------------
    // Checkout Session (subscription sign-up)
    // -------------------------------------------------------------------------

    /**
     * Creates a Stripe Checkout Session in {@code subscription} mode.
     * <p>
     * Use an idempotency key derived from the user ID + timestamp to prevent
     * double charges on network retries.
     * </p>
     *
     * @param stripeCustomerId existing Stripe Customer ID
     * @param idempotencyKey   unique key for this request attempt
     */
    public Session createCheckoutSession(String stripeCustomerId,
                                         long quantity,
                                         String idempotencyKey) throws StripeException {
        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setCustomer(stripeCustomerId)
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setPrice(properties.getPriceId())
                        .setQuantity(Math.max(1L, quantity))
                        .build())
                // No trial here — trial is tracked in-app before the customer
                // ever reaches Checkout, so they already know the product.
                .setSuccessUrl(properties.getSuccessUrl() + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(properties.getCancelUrl())
                .build();

        RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey(idempotencyKey)
                .build();

        return Session.create(params, options);
    }

    // -------------------------------------------------------------------------
    // Customer Portal (self-service billing management)
    // -------------------------------------------------------------------------

    /**
     * Creates a Stripe Billing Portal session for the given customer.
     * The returned URL is single-use and expires after a short time.
     */
    public com.stripe.model.billingportal.Session createPortalSession(
            String stripeCustomerId) throws StripeException {
        com.stripe.param.billingportal.SessionCreateParams params =
                com.stripe.param.billingportal.SessionCreateParams.builder()
                        .setCustomer(stripeCustomerId)
                        .setReturnUrl(properties.getPortalReturnUrl())
                        .build();
        return com.stripe.model.billingportal.Session.create(params);
    }

    // -------------------------------------------------------------------------
    // Subscription management
    // -------------------------------------------------------------------------

    /**
     * Cancels a subscription immediately (at period end = false).
     * Prefer cancelling at period end to avoid prorating.
     */
    public Subscription cancelSubscriptionAtPeriodEnd(String subscriptionId) throws StripeException {
        Subscription subscription = Subscription.retrieve(subscriptionId);
        SubscriptionCancelParams params = SubscriptionCancelParams.builder()
                .build();
        return subscription.cancel(params);
    }

    /**
     * Retrieves the latest subscription snapshot from Stripe.
     * Callers should use this as the source of truth for quantity/status sync.
     */
    public Subscription retrieveSubscription(String subscriptionId) throws StripeException {
        return Subscription.retrieve(subscriptionId);
    }

    /**
     * Updates the quantity on the first subscription item.
     * This application uses a single-price subscription, so one item is expected.
     */
    public Subscription updateSubscriptionQuantity(String subscriptionId, long quantity) throws StripeException {
        Subscription subscription = Subscription.retrieve(subscriptionId);
        if (subscription.getItems() == null
                || subscription.getItems().getData() == null
                || subscription.getItems().getData().isEmpty()) {
            throw new IllegalStateException("Subscription has no items: " + subscriptionId);
        }
        String itemId = subscription.getItems().getData().get(0).getId();
        SubscriptionUpdateParams params = SubscriptionUpdateParams.builder()
                .addItem(SubscriptionUpdateParams.Item.builder()
                        .setId(itemId)
                        .setQuantity(Math.max(1L, quantity))
                        .build())
                .setProrationBehavior(SubscriptionUpdateParams.ProrationBehavior.CREATE_PRORATIONS)
                .build();
        return subscription.update(params);
    }

    /**
     * Retrieves a checkout session by ID.
     */
    public Session retrieveCheckoutSession(String sessionId) throws StripeException {
        return Session.retrieve(sessionId);
    }

    /**
     * Lists subscriptions for a Stripe customer (most recent first by API default).
     */
    public List<Subscription> listSubscriptionsForCustomer(String customerId) throws StripeException {
        SubscriptionListParams params = SubscriptionListParams.builder()
                .setCustomer(customerId)
                .setStatus(SubscriptionListParams.Status.ALL)
                .setLimit(10L)
                .build();
        return Subscription.list(params).getData();
    }

    // -------------------------------------------------------------------------
    // Webhook signature verification
    // -------------------------------------------------------------------------

    /**
     * Constructs and verifies a Stripe Event from a raw webhook payload.
     *
     * @param rawPayload   the raw request body string (must NOT be parsed first)
     * @param sigHeader    the value of the {@code Stripe-Signature} HTTP header
     * @return the verified {@link Event}
     * @throws SignatureVerificationException if the signature is invalid
     */
    public Event constructWebhookEvent(String rawPayload, String sigHeader)
            throws SignatureVerificationException {
        return Webhook.constructEvent(rawPayload, sigHeader, properties.getWebhookSecret());
    }
}
