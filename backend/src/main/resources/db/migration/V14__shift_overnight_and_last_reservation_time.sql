ALTER TABLE shift
    ADD COLUMN IF NOT EXISTS last_reservation_time TIME;

UPDATE shift
SET last_reservation_time = end_time
WHERE last_reservation_time IS NULL;

ALTER TABLE shift
    ALTER COLUMN last_reservation_time SET NOT NULL;

ALTER TABLE shift
    DROP CONSTRAINT IF EXISTS shift_times_valid;

ALTER TABLE shift
    ADD CONSTRAINT shift_times_valid CHECK (start_time <> end_time);

COMMENT ON COLUMN shift.last_reservation_time IS 'Latest local time a reservation can start for this shift';
