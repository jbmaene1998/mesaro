ALTER TABLE email_send_log
    DROP CONSTRAINT IF EXISTS email_send_log_type_valid;

ALTER TABLE email_send_log
    ADD CONSTRAINT email_send_log_type_valid CHECK (
        email_type IN (
            'RESERVATION_CONFIRMATION',
            'RESERVATION_CANCELLED',
            'RESERVATION_REMINDER',
            'STAFF_INVITE',
            'STAFF_REMOVAL',
            'PASSWORD_RESET',
            'ACCOUNT_WELCOME',
            'BILLING_TRIAL_ENDING',
            'BILLING_PAYMENT_FAILED',
            'BILLING_SUBSCRIPTION_ENDED'
        )
        OR email_type LIKE 'BILLING_TRIAL_ENDING:%'
    );
