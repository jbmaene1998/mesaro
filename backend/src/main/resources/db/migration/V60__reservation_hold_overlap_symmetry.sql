-- Close the reservation↔hold asymmetry in V17:
-- reservation_table inserts previously ignored active holds, so confirm/walk-in
-- paths that skipped app-level hold checks could double-book a table.
-- Confirm must release the converting hold's hold_table rows before insert
-- (see ReservationService.confirm) so this trigger does not block the happy path.

CREATE OR REPLACE FUNCTION enforce_reservation_table_no_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_reservation RECORD;
BEGIN
    SELECT id, start_at_utc, end_at_utc, status
    INTO current_reservation
    FROM reservation
    WHERE id = NEW.reservation_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF current_reservation.status NOT IN ('CONFIRMED', 'SEATED') THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM reservation_table rt
        JOIN reservation r ON r.id = rt.reservation_id
        WHERE rt.table_id = NEW.table_id
          AND rt.reservation_id <> NEW.reservation_id
          AND r.status IN ('CONFIRMED', 'SEATED')
          AND r.start_at_utc < current_reservation.end_at_utc
          AND r.end_at_utc > current_reservation.start_at_utc
    ) THEN
        RAISE EXCEPTION 'Table % is already reserved for an overlapping time slot', NEW.table_id
            USING ERRCODE = '23P01';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM hold_table ht
        JOIN hold h ON h.id = ht.hold_id
        WHERE ht.table_id = NEW.table_id
          AND h.confirmed = false
          AND h.expires_at_utc > (NOW() AT TIME ZONE 'UTC')
          AND h.start_at_utc < current_reservation.end_at_utc
          AND h.end_at_utc > current_reservation.start_at_utc
    ) THEN
        RAISE EXCEPTION 'Table % is already held for an overlapping time slot', NEW.table_id
            USING ERRCODE = '23P01';
    END IF;

    RETURN NEW;
END;
$$;

-- Re-validate when a reservation's window or status changes (future reschedule paths).
CREATE OR REPLACE FUNCTION enforce_reservation_schedule_no_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    table_row RECORD;
BEGIN
    IF NEW.status NOT IN ('CONFIRMED', 'SEATED') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.start_at_utc = OLD.start_at_utc
       AND NEW.end_at_utc = OLD.end_at_utc
       AND NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    FOR table_row IN
        SELECT table_id FROM reservation_table WHERE reservation_id = NEW.id
    LOOP
        IF EXISTS (
            SELECT 1
            FROM reservation_table rt
            JOIN reservation r ON r.id = rt.reservation_id
            WHERE rt.table_id = table_row.table_id
              AND rt.reservation_id <> NEW.id
              AND r.status IN ('CONFIRMED', 'SEATED')
              AND r.start_at_utc < NEW.end_at_utc
              AND r.end_at_utc > NEW.start_at_utc
        ) THEN
            RAISE EXCEPTION 'Table % is already reserved for an overlapping time slot', table_row.table_id
                USING ERRCODE = '23P01';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM hold_table ht
            JOIN hold h ON h.id = ht.hold_id
            WHERE ht.table_id = table_row.table_id
              AND h.confirmed = false
              AND h.expires_at_utc > (NOW() AT TIME ZONE 'UTC')
              AND h.start_at_utc < NEW.end_at_utc
              AND h.end_at_utc > NEW.start_at_utc
        ) THEN
            RAISE EXCEPTION 'Table % is already held for an overlapping time slot', table_row.table_id
                USING ERRCODE = '23P01';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservation_schedule_no_overlap ON reservation;
CREATE TRIGGER trg_reservation_schedule_no_overlap
BEFORE UPDATE OF start_at_utc, end_at_utc, status ON reservation
FOR EACH ROW
EXECUTE FUNCTION enforce_reservation_schedule_no_overlap();
