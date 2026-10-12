-- =============================================================================
-- V51: Per-owner restaurant quota
-- Adds max_restaurants to user_account so that the number of restaurants an
-- owner may hold is controlled by their subscription quantity.
-- Default of 1 gives every new owner one free trial restaurant.
-- =============================================================================

ALTER TABLE user_account
    ADD COLUMN max_restaurants INT NOT NULL DEFAULT 1;

ALTER TABLE user_account
    ADD CONSTRAINT user_account_max_restaurants_check
        CHECK (max_restaurants >= 1);

COMMENT ON COLUMN user_account.max_restaurants IS
    'Maximum number of active restaurants this owner may hold. '
    'Incremented automatically when a restaurant subscription becomes ACTIVE.';
