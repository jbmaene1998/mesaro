-- New accounts stay unverified until they open the email link.
-- Accounts that already exist keep working.
ALTER TABLE user_account
    ADD COLUMN email_verified_at TIMESTAMP;

UPDATE user_account
SET email_verified_at = COALESCE(created_at_utc, NOW())
WHERE email_verified_at IS NULL;

CREATE TABLE email_verification (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    expires_at_utc  TIMESTAMP NOT NULL,
    used_at_utc     TIMESTAMP,
    created_at_utc  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_email_verification_token ON email_verification(token_hash);
CREATE UNIQUE INDEX uq_email_verification_active_user ON email_verification(user_id)
    WHERE used_at_utc IS NULL;

COMMENT ON TABLE email_verification IS 'Single-use account verification tokens';
COMMENT ON COLUMN user_account.email_verified_at IS 'When the user confirmed their email. NULL blocks login.';
