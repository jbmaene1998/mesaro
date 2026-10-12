package com.mesaro.config;

import com.mesaro.billing.StripeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Fail-fast startup checks for production and other non-dev profiles.
 * Rejects insecure placeholder secrets, blank Stripe keys when billing is expected,
 * and {@code EMAIL_PROVIDER=log} outside local development.
 */
@Component
public class ProductionSecurityValidator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductionSecurityValidator.class);
    private static final Set<String> DEV_PROFILES = Set.of("dev", "local", "test");

    private final Environment environment;
    private final AppProperties appProperties;
    private final StripeProperties stripeProperties;

    public ProductionSecurityValidator(
            Environment environment,
            AppProperties appProperties,
            StripeProperties stripeProperties) {
        this.environment = environment;
        this.appProperties = appProperties;
        this.stripeProperties = stripeProperties;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (isDevLikeProfile()) {
            log.debug("Skipping production security validation for profiles {}",
                    Arrays.toString(environment.getActiveProfiles()));
            return;
        }

        List<String> errors = new ArrayList<>();

        rejectInsecure("app.security.jwt.secret",
                appProperties.getSecurity().getJwt().getSecret(),
                AppProperties.INSECURE_DEV_JWT_SECRET,
                errors);
        rejectInsecure("app.hold.token-secret",
                appProperties.getHold().getTokenSecret(),
                AppProperties.INSECURE_DEV_HOLD_TOKEN_SECRET,
                errors);
        rejectInsecure("app.reservation.token-secret",
                appProperties.getReservation().getTokenSecret(),
                AppProperties.INSECURE_DEV_RESERVATION_TOKEN_SECRET,
                errors);
        rejectInsecure("app.staff.token-secret",
                appProperties.getStaff().getTokenSecret(),
                AppProperties.INSECURE_DEV_STAFF_TOKEN_SECRET,
                errors);

        String emailProvider = appProperties.getEmail().getProvider();
        if (emailProvider == null || emailProvider.isBlank() || "log".equalsIgnoreCase(emailProvider)) {
            errors.add("app.email.provider must not be 'log' outside dev (set EMAIL_PROVIDER=resend|smtp)");
        }

        if (isBlank(stripeProperties.getSecretKey())) {
            errors.add("app.stripe.secret-key is required outside dev (STRIPE_SECRET_KEY)");
        }
        if (isBlank(stripeProperties.getWebhookSecret())) {
            errors.add("app.stripe.webhook-secret is required outside dev (STRIPE_WEBHOOK_SECRET)");
        }
        if (isBlank(stripeProperties.getPriceId())) {
            errors.add("app.stripe.price-id is required outside dev (STRIPE_PRICE_ID)");
        }

        if (!errors.isEmpty()) {
            String message = "Refusing to start with insecure production configuration:\n - "
                    + String.join("\n - ", errors);
            throw new IllegalStateException(message);
        }

        log.info("Production security validation passed");
    }

    private boolean isDevLikeProfile() {
        String[] active = environment.getActiveProfiles();
        if (active.length == 0) {
            // Default profile is treated as non-prod for local ergonomics.
            return true;
        }
        return Arrays.stream(active).anyMatch(p -> DEV_PROFILES.contains(p.toLowerCase()));
    }

    private static void rejectInsecure(String name, String value, String insecurePlaceholder, List<String> errors) {
        if (isBlank(value)) {
            errors.add(name + " must not be blank");
            return;
        }
        if (value.equals(insecurePlaceholder) || value.startsWith("insecure-dev-")) {
            errors.add(name + " must not use insecure-dev placeholder values");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
