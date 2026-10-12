-- V53: Remove deprecated per-restaurant billing columns.
-- Billing is now owner-scoped via user_account.

ALTER TABLE restaurant
    DROP CONSTRAINT IF EXISTS restaurant_stripe_customer_id_key,
    DROP CONSTRAINT IF EXISTS restaurant_stripe_subscription_id_key,
    DROP CONSTRAINT IF EXISTS restaurant_billing_status_check;

DROP INDEX IF EXISTS restaurant_billing_status_idx;
DROP INDEX IF EXISTS restaurant_stripe_customer_idx;

ALTER TABLE restaurant
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS billing_status,
    DROP COLUMN IF EXISTS trial_ends_at,
    DROP COLUMN IF EXISTS stripe_price_id;
