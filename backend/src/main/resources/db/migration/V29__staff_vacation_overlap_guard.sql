-- Prevent two overlapping PENDING or APPROVED STAFF_VACATION rows for the
-- same (restaurant_id, user_id). The date_range generated column was added in V18.
-- Requires btree_gist (already enabled by V18).

ALTER TABLE vacation
  ADD CONSTRAINT vacation_no_staff_vacation_overlap
  EXCLUDE USING GIST (
    restaurant_id WITH =,
    user_id       WITH =,
    date_range    WITH &&
  )
  WHERE (type = 'STAFF_VACATION' AND status IN ('PENDING', 'APPROVED'));
