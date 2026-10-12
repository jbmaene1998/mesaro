-- hold -> table is modeled by hold_table (N:M).
-- A direct exclusion constraint on hold is not possible without denormalization.
-- The overlap guarantee is enforced by trg_hold_table_no_overlap (V17).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_hold_table_no_overlap'
    ) THEN
        RAISE EXCEPTION 'Missing required trigger trg_hold_table_no_overlap';
    END IF;
END
$$;
