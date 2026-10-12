-- Prevent structural changes (day_of_week, start_time, end_time,
-- last_reservation_time, slot_duration_minutes) on shifts that are not in DRAFT.
-- The service layer already enforces this; this is the last-resort DB guard.

CREATE OR REPLACE FUNCTION prevent_shift_structural_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND (
    NEW.day_of_week           IS DISTINCT FROM OLD.day_of_week OR
    NEW.start_time            IS DISTINCT FROM OLD.start_time OR
    NEW.end_time              IS DISTINCT FROM OLD.end_time OR
    NEW.last_reservation_time IS DISTINCT FROM OLD.last_reservation_time OR
    NEW.slot_duration_minutes IS DISTINCT FROM OLD.slot_duration_minutes
  ) THEN
    RAISE EXCEPTION
      'Structural fields of shift % cannot be changed when status is %',
      OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shift_structural_immutable
BEFORE UPDATE ON shift
FOR EACH ROW EXECUTE FUNCTION prevent_shift_structural_change();
