CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE vacation
    ADD COLUMN IF NOT EXISTS date_range daterange
        GENERATED ALWAYS AS (daterange(start_date, end_date, '[]')) STORED;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'no_overlap_vacation_per_user'
    ) THEN
        ALTER TABLE vacation
            ADD CONSTRAINT no_overlap_vacation_per_user
            EXCLUDE USING gist (
                user_id WITH =,
                restaurant_id WITH =,
                date_range WITH &&
            )
            WHERE (status = 'APPROVED');
    END IF;
END
$$;
