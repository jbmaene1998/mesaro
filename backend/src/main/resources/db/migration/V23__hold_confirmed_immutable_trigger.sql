-- Prevent hold.confirmed from ever being set back to false once true.

CREATE OR REPLACE FUNCTION hold_confirmed_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.confirmed = TRUE AND NEW.confirmed = FALSE THEN
    RAISE EXCEPTION
      'hold.confirmed cannot be set back to false (hold id=%)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hold_confirmed_immutable
BEFORE UPDATE OF confirmed ON hold
FOR EACH ROW EXECUTE FUNCTION hold_confirmed_immutable();
