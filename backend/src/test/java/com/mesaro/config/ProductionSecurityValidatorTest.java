package com.mesaro.config;

import com.mesaro.billing.StripeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionSecurityValidatorTest {

    private MockEnvironment environment;
    private AppProperties appProperties;
    private StripeProperties stripeProperties;

    @BeforeEach
    void setUp() {
        environment = new MockEnvironment().withProperty("spring.mail.properties.mail.smtp.auth", "true");
        appProperties = secureAppProperties();
        stripeProperties = secureStripeProperties();
    }

    @Test
    void devProfile_skipsValidation() {
        environment.setActiveProfiles("dev");
        appProperties.getEmail().setProvider("log");
        appProperties.getEmail().getResend().setApiKey("");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatCode(() -> validator.run(new DefaultApplicationArguments()))
                .doesNotThrowAnyException();
    }

    @Test
    void prodProfile_resend_requiresApiKey() {
        environment.setActiveProfiles("prod");
        appProperties.getEmail().setProvider("resend");
        appProperties.getEmail().getResend().setApiKey("");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatThrownBy(() -> validator.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.email.resend.api-key");
    }

    @Test
    void prodProfile_resend_passesWithApiKey() {
        environment.setActiveProfiles("prod");
        appProperties.getEmail().setProvider("resend");
        appProperties.getEmail().getResend().setApiKey("re_test_key");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatCode(() -> validator.run(new DefaultApplicationArguments()))
                .doesNotThrowAnyException();
    }

    @Test
    void prodProfile_smtp_requiresHostAndCredentialsWhenAuthEnabled() {
        environment.setActiveProfiles("prod");
        appProperties.getEmail().setProvider("smtp");
        environment.setProperty("spring.mail.host", "");
        environment.setProperty("spring.mail.username", "");
        environment.setProperty("spring.mail.password", "");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatThrownBy(() -> validator.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.mail.host")
                .hasMessageContaining("spring.mail.username")
                .hasMessageContaining("spring.mail.password");
    }

    @Test
    void prodProfile_smtp_passesWhenHostSetAndAuthDisabled() {
        environment.setActiveProfiles("prod");
        appProperties.getEmail().setProvider("smtp");
        environment.setProperty("spring.mail.host", "smtp.example.com");
        environment.setProperty("spring.mail.properties.mail.smtp.auth", "false");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatCode(() -> validator.run(new DefaultApplicationArguments()))
                .doesNotThrowAnyException();
    }

    @Test
    void prodProfile_rejectsBlankFromAddress() {
        environment.setActiveProfiles("prod");
        appProperties.getEmail().setProvider("resend");
        appProperties.getEmail().getResend().setApiKey("re_test_key");
        appProperties.getEmail().setFromAddress("   ");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatThrownBy(() -> validator.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.email.from-address");
    }

    @Test
    void prodProfile_rejectsBlankSupportAddress() {
        environment.setActiveProfiles("prod");
        appProperties.getEmail().setProvider("resend");
        appProperties.getEmail().getResend().setApiKey("re_test_key");
        appProperties.getEmail().setSupportAddress("   ");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatThrownBy(() -> validator.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.email.support-address");
    }

    @Test
    void prodProfile_rejectsLogProvider() {
        environment.setActiveProfiles("prod");
        appProperties.getEmail().setProvider("log");

        ProductionSecurityValidator validator =
                new ProductionSecurityValidator(environment, appProperties, stripeProperties);

        assertThatThrownBy(() -> validator.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.email.provider must not be 'log'");
    }

    private static AppProperties secureAppProperties() {
        AppProperties props = new AppProperties();
        props.getSecurity().getJwt().setSecret("prod-jwt-secret-at-least-32-chars-long");
        props.getHold().setTokenSecret("prod-hold-secret-at-least-32-chars");
        props.getReservation().setTokenSecret("prod-reservation-secret-32-chars");
        props.getStaff().setTokenSecret("prod-staff-secret-at-least-32-chars");
        props.getEmail().setProvider("resend");
        props.getEmail().setFromAddress("noreply@example.com");
        props.getEmail().setSupportAddress("support@example.com");
        props.getEmail().getResend().setApiKey("re_test_key");
        return props;
    }

    private static StripeProperties secureStripeProperties() {
        StripeProperties stripe = new StripeProperties();
        stripe.setSecretKey("sk_test_secret");
        stripe.setWebhookSecret("whsec_test");
        stripe.setPriceId("price_test");
        return stripe;
    }
}
