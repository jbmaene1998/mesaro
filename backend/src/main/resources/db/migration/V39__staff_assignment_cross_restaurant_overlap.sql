CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE staff_shift_assignment
    ADD COLUMN IF NOT EXISTS service_window tsrange
        GENERATED ALWAYS AS (
            tsrange(
                (service_date::timestamp + planned_start_local_time),
                (
                    service_date::timestamp
                    + planned_end_local_time
                    + CASE
                        WHEN planned_end_local_time <= planned_start_local_time THEN interval '1 day'
                        ELSE interval '0 day'
                    END
                ),
                '[)'
            )
        ) STORED;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'no_overlap_staff_schedule_per_user'
    ) THEN
        ALTER TABLE staff_shift_assignment
            ADD CONSTRAINT no_overlap_staff_schedule_per_user
            EXCLUDE USING gist (
                user_id WITH =,
                service_window WITH &&
            );
    END IF;
END
$$;
