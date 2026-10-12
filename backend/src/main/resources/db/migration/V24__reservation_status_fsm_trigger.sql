-- Enforce the reservation status finite-state machine at DB level.
-- Valid transitions:
--   CONFIRMED  -> SEATED | NO_SHOW | CANCELLED
--   SEATED     -> COMPLETED | CANCELLED
--   COMPLETED, NO_SHOW, CANCELLED -> nothing (terminal)
--
-- Pre-flight validation (run first, must return 0 rows):
-- SELECT id, status FROM reservation
-- WHERE status NOT IN ('CONFIRMED','SEATED','COMPLETED','NO_SHOW','CANCELLED');

CREATE OR REPLACE FUNCTION enforce_reservation_status_fsm()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- No-op if status is unchanged
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Block any transition out of terminal states
  IF OLD.status IN ('COMPLETED', 'NO_SHOW', 'CANCELLED') THEN
    RAISE EXCEPTION
      'Reservation % is in terminal status %, cannot transition to %',
      OLD.id, OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate allowed transitions
  IF NOT (
    (OLD.status = 'CONFIRMED' AND NEW.status IN ('SEATED', 'NO_SHOW', 'CANCELLED')) OR
    (OLD.status = 'SEATED' AND NEW.status IN ('COMPLETED', 'CANCELLED'))
  ) THEN
    RAISE EXCEPTION
      'Invalid reservation status transition: % -> %',
      OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_status_fsm
BEFORE UPDATE OF status ON reservation
FOR EACH ROW EXECUTE FUNCTION enforce_reservation_status_fsm();
