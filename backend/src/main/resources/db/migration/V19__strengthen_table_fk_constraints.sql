-- Make table deletion impossible at DB level if referenced by reservations or holds.
-- The service layer already blocks this, but this is the last-resort guard.

-- reservation_table already has ON DELETE CASCADE - change to RESTRICT.
ALTER TABLE reservation_table
    DROP CONSTRAINT reservation_table_table_id_fkey;
ALTER TABLE reservation_table
    ADD CONSTRAINT reservation_table_table_id_fkey
    FOREIGN KEY (table_id)
    REFERENCES dining_table(id)
    ON DELETE RESTRICT;

-- hold_table already has no ON DELETE action - make RESTRICT explicit.
ALTER TABLE hold_table
    DROP CONSTRAINT hold_table_table_id_fkey;
ALTER TABLE hold_table
    ADD CONSTRAINT hold_table_table_id_fkey
    FOREIGN KEY (table_id)
    REFERENCES dining_table(id)
    ON DELETE RESTRICT;
