package com.mesaro.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.BindException;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.bind.validation.ValidationBindHandler;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RateLimitPropertiesValidationTest {

    @Test
    void bind_rejectsZeroDefaultRequests() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.rate-limit.default-requests", "0")
                .withProperty("app.rate-limit.default-window-seconds", "60");

        assertBindFails(environment, "defaultRequests");
    }

    @Test
    void bind_rejectsZeroEndpointWindow() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.rate-limit.default-requests", "100")
                .withProperty("app.rate-limit.default-window-seconds", "60")
                .withProperty("app.rate-limit.endpoints.auth.requests", "10")
                .withProperty("app.rate-limit.endpoints.auth.window-seconds", "0");

        assertBindFails(environment, "windowSeconds");
    }

    @Test
    void bind_acceptsValidLimits() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.rate-limit.default-requests", "100")
                .withProperty("app.rate-limit.default-window-seconds", "60")
                .withProperty("app.rate-limit.endpoints.auth.requests", "10")
                .withProperty("app.rate-limit.endpoints.auth.window-seconds", "60");

        RateLimitProperties properties = bind(environment);
        assertThat(properties.getDefaultRequests()).isEqualTo(100);
        assertThat(properties.getEndpoints().get("auth").getRequests()).isEqualTo(10);
    }

    private void assertBindFails(MockEnvironment environment, String expectedField) {
        assertThatThrownBy(() -> bind(environment))
                .isInstanceOf(BindException.class)
                .hasStackTraceContaining(expectedField);
    }

    private RateLimitProperties bind(MockEnvironment environment) {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        ValidationBindHandler validationHandler = new ValidationBindHandler(validator);
        return Binder.get(environment)
                .bind("app.rate-limit", Bindable.of(RateLimitProperties.class), validationHandler)
                .orElseThrow(() -> new IllegalStateException("Rate limit properties were not bound"));
    }
}
