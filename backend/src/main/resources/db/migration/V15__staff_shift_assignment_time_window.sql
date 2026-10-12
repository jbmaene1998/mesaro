ALTER TABLE staff_shift_assignment
    ADD COLUMN planned_start_local_time TIME,
    ADD COLUMN planned_end_local_time TIME;

UPDATE staff_shift_assignment a
SET planned_start_local_time = s.start_time,
    planned_end_local_time = s.end_time
FROM shift s
WHERE s.id = a.shift_id
  AND (a.planned_start_local_time IS NULL OR a.planned_end_local_time IS NULL);

ALTER TABLE staff_shift_assignment
    ALTER COLUMN planned_start_local_time SET NOT NULL,
    ALTER COLUMN planned_end_local_time SET NOT NULL;
