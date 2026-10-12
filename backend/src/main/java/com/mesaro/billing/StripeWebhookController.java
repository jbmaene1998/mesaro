package com.mesaro.billing;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Receives and verifies Stripe webhook events.
 * <p>
 * This endpoint is intentionally unauthenticated (no JWT required) because
 * Stripe authenticates requests via HMAC signature instead. All other
 * security relies on {@link StripeService#constructWebhookEvent} raising
 * {@link SignatureVerificationException} for tampered payloads.
 * </p>
 * <p>
 * Durability: claim event as {@code processing}, handle, then mark {@code done}.
 * On handler failure mark {@code failed} and return 500 so Stripe retries;
 * {@link BillingService#tryClaimEvent} reclaims failed / stale processing rows.
 * </p>
 */
@RestController
@RequestMapping("/api/webhooks/stripe")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final StripeService stripeService;
    private final BillingService billingService;

    public StripeWebhookController(StripeService stripeService, BillingService billingService) {
        this.stripeService = stripeService;
        this.billingService = billingService;
    }

    /**
     * Stripe sends events as JSON with a {@code Stripe-Signature} header.
     * Spring's {@code StringHttpMessageConverter} delivers the raw body string
     * without modification, which is required for signature verification.
     */
    @PostMapping(consumes = "application/json")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;
        try {
            event = stripeService.constructWebhookEvent(rawPayload, sigHeader);
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }

        try {
            boolean claimed = billingService.tryClaimEvent(event.getId(), event.getType());
            if (!claimed) {
                log.debug("Stripe event {} already claimed or done - skipping", event.getId());
                return ResponseEntity.ok().build();
            }
        } catch (Exception e) {
            log.error("Failed to claim Stripe event {}: {}", event.getId(), e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }

        try {
            route(event);
            billingService.markEventDone(event.getId());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error processing Stripe event {} ({}): {}",
                    event.getId(), event.getType(), e.getMessage(), e);
            try {
                billingService.markEventFailed(event.getId());
            } catch (Exception markError) {
                log.error("Failed to mark Stripe event {} as failed: {}",
                        event.getId(), markError.getMessage(), markError);
            }
            return ResponseEntity.internalServerError().build();
        }
    }

    private void route(Event event) {
        log.info("Processing Stripe event {} ({})", event.getId(), event.getType());

        switch (event.getType()) {

            case "checkout.session.completed" -> {
                Session session = deserialize(event, Session.class);
                if (session != null) {
                    billingService.handleCheckoutSessionCompleted(session);
                }
            }

            case "customer.subscription.updated" -> {
                Subscription sub = deserialize(event, Subscription.class);
                if (sub != null) {
                    billingService.handleSubscriptionUpdated(sub);
                }
            }

            case "customer.subscription.deleted" -> {
                Subscription sub = deserialize(event, Subscription.class);
                if (sub != null) {
                    billingService.handleSubscriptionDeleted(sub);
                }
            }

            case "invoice.payment_succeeded" -> {
                Invoice invoice = deserialize(event, Invoice.class);
                if (invoice != null) {
                    billingService.handleInvoicePaymentSucceeded(invoice);
                }
            }

            case "invoice.payment_failed" -> {
                Invoice invoice = deserialize(event, Invoice.class);
                if (invoice != null) {
                    billingService.handleInvoicePaymentFailed(invoice);
                }
            }

            case "customer.subscription.trial_will_end" ->
                    log.debug("customer.subscription.trial_will_end received (Stripe-managed trial, not standard flow)");

            default ->
                    log.debug("Unhandled Stripe event type: {}", event.getType());
        }
    }

    @SuppressWarnings("unchecked")
    private <T extends StripeObject> T deserialize(Event event, Class<T> type) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        if (deserializer.getObject().isPresent()) {
            StripeObject obj = deserializer.getObject().get();
            if (type.isInstance(obj)) {
                return (T) obj;
            }
        }
        log.warn("Could not deserialize event {} data as {}", event.getId(), type.getSimpleName());
        return null;
    }
}
