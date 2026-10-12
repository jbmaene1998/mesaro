-- Durable Stripe webhook processing: claim → process → done/failed.
-- Allows Stripe retries when handling fails after the event was claimed.

ALTER TABLE stripe_webhook_event
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'done';

-- Rows inserted before this migration were treated as fully processed.
UPDATE stripe_webhook_event
SET status = 'done'
WHERE status IS NULL OR status = '';

ALTER TABLE stripe_webhook_event
    DROP CONSTRAINT IF EXISTS stripe_webhook_event_status_chk;

ALTER TABLE stripe_webhook_event
    ADD CONSTRAINT stripe_webhook_event_status_chk
        CHECK (status IN ('processing', 'done', 'failed'));

CREATE INDEX IF NOT EXISTS stripe_webhook_event_status_processed_at_idx
    ON stripe_webhook_event (status, processed_at);

COMMENT ON COLUMN stripe_webhook_event.status IS
    'processing = claimed; done = handled OK; failed = handler error (Stripe may retry)';
