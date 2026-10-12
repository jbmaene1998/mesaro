-- V56: Track first payment failure for PAST_DUE grace window (7 days before access block).

ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;

-- Anchor grace for owners already in PAST_DUE when this migration runs.
UPDATE user_account
SET past_due_since = NOW()
WHERE billing_status = 'PAST_DUE'
  AND past_due_since IS NULL;
