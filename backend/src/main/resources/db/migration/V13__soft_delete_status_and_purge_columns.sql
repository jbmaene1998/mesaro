ALTER TABLE user_account
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN deleted_at_utc TIMESTAMP;

CREATE INDEX idx_user_account_status_deleted_at
    ON user_account(status, deleted_at_utc)
    WHERE status = 'DELETED';

ALTER TABLE restaurant
    ADD COLUMN deleted_at_utc TIMESTAMP;

CREATE INDEX idx_restaurant_status_deleted_at
    ON restaurant(status, deleted_at_utc)
    WHERE status = 'DELETED';
