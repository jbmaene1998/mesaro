-- V54: Stripe webhook idempotency constraint + performance indexes

-- 1. Unique constraint required for atomic webhook idempotency (see BillingService)
ALTER TABLE stripe_webhook_event
    ADD CONSTRAINT stripe_webhook_event_event_id_uk UNIQUE (event_id);

-- 2. Outbox polling index - OutboxWorker queries unprocessed rows every 5 seconds
CREATE INDEX IF NOT EXISTS idx_outbox_event_unprocessed_created_at
    ON outbox_event (created_at ASC)
    WHERE processed_at IS NULL;

-- 3. Vacation closure date-range lookup - called on every hold creation
CREATE INDEX IF NOT EXISTS idx_vacation_closure_date_range
    ON vacation (restaurant_id, start_date, end_date)
    WHERE type = 'RESTAURANT_CLOSURE'
      AND status NOT IN ('CANCELLED', 'REJECTED');
