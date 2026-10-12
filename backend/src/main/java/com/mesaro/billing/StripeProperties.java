package com.mesaro.billing;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Stripe configuration bound from {@code app.stripe.*} in application.yml.
 * <p>
 * All values should be supplied via environment variables in production —
 * never hard-coded.
 * </p>
 */
@Component
@ConfigurationProperties(prefix = "app.stripe")
public class StripeProperties {

    /** Stripe secret key (sk_live_* or sk_test_*). Server-side only. */
    private String secretKey = "";

    /** Stripe webhook signing secret (whsec_*). Used to verify event signatures. */
    private String webhookSecret = "";

    /** Stripe Price ID for the €49.99/month subscription plan. */
    private String priceId = "";

    /** Frontend URL Stripe redirects to after successful checkout. */
    private String successUrl = "http://localhost:5173/billing/success";

    /** Frontend URL Stripe redirects to when the user cancels checkout. */
    private String cancelUrl = "http://localhost:5173/billing/cancel";

    /** Frontend URL to return to after the Customer Portal session. */
    private String portalReturnUrl = "http://localhost:5173/settings/billing";

    // -------------------------------------------------------------------------
    // Getters / Setters (Spring Boot property binding requires them)
    // -------------------------------------------------------------------------

    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }

    public String getWebhookSecret() { return webhookSecret; }
    public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }

    public String getPriceId() { return priceId; }
    public void setPriceId(String priceId) { this.priceId = priceId; }

    public String getSuccessUrl() { return successUrl; }
    public void setSuccessUrl(String successUrl) { this.successUrl = successUrl; }

    public String getCancelUrl() { return cancelUrl; }
    public void setCancelUrl(String cancelUrl) { this.cancelUrl = cancelUrl; }

    public String getPortalReturnUrl() { return portalReturnUrl; }
    public void setPortalReturnUrl(String portalReturnUrl) { this.portalReturnUrl = portalReturnUrl; }
}
