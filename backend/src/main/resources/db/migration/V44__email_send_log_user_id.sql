ALTER TABLE email_send_log
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES user_account(id) ON DELETE SET NULL;

ALTER TABLE email_send_log
    DROP CONSTRAINT IF EXISTS email_send_log_type_valid;

ALTER TABLE email_send_log
    ADD CONSTRAINT email_send_log_type_valid CHECK (
        email_type IN (
            'RESERVATION_CONFIRMATION',
            'RESERVATION_CANCELLED',
            'RESERVATION_REMINDER',
            'STAFF_INVITE',
            'PASSWORD_RESET',
            'ACCOUNT_WELCOME'
        )
        OR email_type LIKE 'BILLING_TRIAL_ENDING:%'
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_send_log_user_email_type
    ON email_send_log (user_id, email_type)
    WHERE user_id IS NOT NULL;
