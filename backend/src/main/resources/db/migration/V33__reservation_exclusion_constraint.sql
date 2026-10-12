-- reservation -> table is modeled by reservation_table (N:M).
-- A direct exclusion constraint on reservation is therefore not possible
-- without denormalizing table_id into reservation.
-- The overlap guarantee is enforced by trg_reservation_table_no_overlap (V17).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_reservation_table_no_overlap'
    ) THEN
        RAISE EXCEPTION 'Missing required trigger trg_reservation_table_no_overlap';
    END IF;
END
$$;
