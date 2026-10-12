-- =============================================================================
-- V50: Per-Restaurant Billing
-- Moves Stripe billing fields from user_account to restaurant so that each
-- restaurant has its own independent trial, Stripe Customer, and subscription.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Add billing columns to restaurant
-- ---------------------------------------------------------------------------
ALTER TABLE restaurant
    ADD COLUMN stripe_customer_id     VARCHAR(100),
    ADD COLUMN stripe_subscription_id VARCHAR(100),
    ADD COLUMN billing_status         VARCHAR(30)  NOT NULL DEFAULT 'TRIALING',
    ADD COLUMN trial_ends_at          TIMESTAMP WITH TIME ZONE
                                          NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    ADD COLUMN stripe_price_id        VARCHAR(100);

ALTER TABLE restaurant
    ADD CONSTRAINT restaurant_stripe_customer_id_key    UNIQUE (stripe_customer_id),
    ADD CONSTRAINT restaurant_stripe_subscription_id_key UNIQUE (stripe_subscription_id);

ALTER TABLE restaurant
    ADD CONSTRAINT restaurant_billing_status_check
        CHECK (billing_status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED'));

CREATE INDEX restaurant_billing_status_idx  ON restaurant (billing_status);
CREATE INDEX restaurant_stripe_customer_idx ON restaurant (stripe_customer_id);

-- ---------------------------------------------------------------------------
-- Drop billing columns from user_account (now owned per-restaurant)
-- ---------------------------------------------------------------------------
ALTER TABLE user_account
    DROP CONSTRAINT IF EXISTS user_account_stripe_customer_id_key,
    DROP CONSTRAINT IF EXISTS user_account_stripe_subscription_id_key,
    DROP CONSTRAINT IF EXISTS user_account_billing_status_check;

DROP INDEX IF EXISTS user_account_billing_status_idx;
DROP INDEX IF EXISTS user_account_stripe_customer_idx;

ALTER TABLE user_account
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS billing_status,
    DROP COLUMN IF EXISTS trial_ends_at,
    DROP COLUMN IF EXISTS stripe_price_id;
