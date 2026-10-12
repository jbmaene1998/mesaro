-- V52: Owner-scoped billing model
-- One Stripe subscription per owner; subscription quantity controls restaurant quota.

ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS billing_status VARCHAR(30) NOT NULL DEFAULT 'TRIALING',
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Existing users without a trial timestamp get a fresh 14-day trial window.
UPDATE user_account
SET trial_ends_at = NOW() + INTERVAL '14 days'
WHERE trial_ends_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_account_billing_status_check'
    ) THEN
        ALTER TABLE user_account
            ADD CONSTRAINT user_account_billing_status_check
            CHECK (billing_status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_account_stripe_customer_uidx
    ON user_account (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_account_stripe_subscription_uidx
    ON user_account (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_account_billing_status_idx
    ON user_account (billing_status);
