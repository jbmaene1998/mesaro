-- Prevent two approved restaurant closures from overlapping on the same restaurant.
-- Requires the btree_gist extension.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE vacation
    ADD COLUMN IF NOT EXISTS date_range daterange
        GENERATED ALWAYS AS (daterange(start_date, end_date, '[]')) STORED;

CREATE INDEX IF NOT EXISTS idx_vacation_closure_daterange
    ON vacation USING GIST (restaurant_id, date_range)
    WHERE type = 'RESTAURANT_CLOSURE' AND status = 'APPROVED';

-- Exclusion constraint: no two approved closures for the same restaurant may overlap.
ALTER TABLE vacation
    ADD CONSTRAINT vacation_no_approved_closure_overlap
    EXCLUDE USING GIST (
        restaurant_id WITH =,
        date_range WITH &&
    )
    WHERE (type = 'RESTAURANT_CLOSURE' AND status = 'APPROVED');
