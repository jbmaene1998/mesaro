-- Prevent shift deletion if any reservation or hold references it.
-- The service layer already blocks this; this is the DB-level backstop.

ALTER TABLE reservation
  DROP CONSTRAINT IF EXISTS reservation_shift_id_fkey;
ALTER TABLE reservation
  ADD CONSTRAINT reservation_shift_id_fkey
  FOREIGN KEY (shift_id) REFERENCES shift(id)
  ON DELETE RESTRICT;

ALTER TABLE hold
  DROP CONSTRAINT IF EXISTS hold_shift_id_fkey;
ALTER TABLE hold
  ADD CONSTRAINT hold_shift_id_fkey
  FOREIGN KEY (shift_id) REFERENCES shift(id)
  ON DELETE RESTRICT;
