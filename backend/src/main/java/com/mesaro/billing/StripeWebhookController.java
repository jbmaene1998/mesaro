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
 * Deserialize failures for handled event types that require a Stripe object must fail
 * the claim (same as handler errors) so Stripe can retry with a recoverable payload.
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

            case "checkout.session.completed" ->
                    billingService.handleCheckoutSessionCompleted(
                            requireDeserialized(event, Session.class));

            case "customer.subscription.updated" ->
                    billingService.handleSubscriptionUpdated(
                            requireDeserialized(event, Subscription.class));

            case "customer.subscription.deleted" ->
                    billingService.handleSubscriptionDeleted(
                            requireDeserialized(event, Subscription.class));

            case "invoice.payment_succeeded" ->
                    billingService.handleInvoicePaymentSucceeded(
                            requireDeserialized(event, Invoice.class));

            case "invoice.payment_failed" ->
                    billingService.handleInvoicePaymentFailed(
                            requireDeserialized(event, Invoice.class));

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

    private <T extends StripeObject> T requireDeserialized(Event event, Class<T> type) {
        T obj = deserialize(event, type);
        if (obj == null) {
            throw new IllegalStateException(
                    "Could not deserialize Stripe event " + event.getId()
                            + " (" + event.getType() + ") data as " + type.getSimpleName());
        }
        return obj;
    }
}
