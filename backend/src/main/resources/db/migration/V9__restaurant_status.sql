-- Add status column to restaurant table to support soft-delete (ARCHIVED).
-- ACTIVE   = normal operational state
-- ARCHIVED = owner-initiated soft delete; hidden from all lists
-- DELETED  = pending physical deletion by scheduled cleanup

ALTER TABLE restaurant
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX idx_restaurant_status ON restaurant (status);
