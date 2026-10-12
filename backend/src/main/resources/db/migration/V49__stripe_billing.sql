-- =============================================================================
-- V49: Stripe Billing Integration
-- Adds Stripe customer/subscription tracking to user_account and creates
-- an idempotency table for webhook event processing.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Billing fields on user_account
-- ---------------------------------------------------------------------------
ALTER TABLE user_account
    ADD COLUMN stripe_customer_id    VARCHAR(100),
    ADD COLUMN stripe_subscription_id VARCHAR(100),
    ADD COLUMN billing_status        VARCHAR(30)  NOT NULL DEFAULT 'TRIALING',
    ADD COLUMN trial_ends_at         TIMESTAMP WITH TIME ZONE
                                         NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    ADD COLUMN stripe_price_id       VARCHAR(100);

ALTER TABLE user_account
    ADD CONSTRAINT user_account_stripe_customer_id_key    UNIQUE (stripe_customer_id),
    ADD CONSTRAINT user_account_stripe_subscription_id_key UNIQUE (stripe_subscription_id);

-- Ensure billing_status is one of the known enum values
ALTER TABLE user_account
    ADD CONSTRAINT user_account_billing_status_check
        CHECK (billing_status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED'));

CREATE INDEX user_account_billing_status_idx   ON user_account (billing_status);
CREATE INDEX user_account_stripe_customer_idx  ON user_account (stripe_customer_id);

-- ---------------------------------------------------------------------------
-- Webhook event idempotency table
-- Prevents duplicate processing of the same Stripe event.
-- ---------------------------------------------------------------------------
CREATE TABLE stripe_webhook_event (
    id           BIGSERIAL PRIMARY KEY,
    event_id     VARCHAR(100)             NOT NULL,
    event_type   VARCHAR(100)             NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT stripe_webhook_event_event_id_key UNIQUE (event_id)
);

CREATE INDEX stripe_webhook_event_processed_at_idx ON stripe_webhook_event (processed_at);

-- ---------------------------------------------------------------------------
-- Retention: purge processed webhook events older than 90 days
-- (handled by existing GDPR purge job or a new scheduled task)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE stripe_webhook_event IS
    'Idempotency log for Stripe webhook events. Events older than 90 days can be purged.';
