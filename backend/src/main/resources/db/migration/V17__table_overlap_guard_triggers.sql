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
        RAISE EXCEPTION 'Table % is already reserved for an overlapping time slot', NEW.table_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_hold_table_no_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_hold RECORD;
BEGIN
    SELECT id, start_at_utc, end_at_utc, confirmed, expires_at_utc
    INTO current_hold
    FROM hold
    WHERE id = NEW.hold_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF current_hold.confirmed = true OR current_hold.expires_at_utc <= (NOW() AT TIME ZONE 'UTC') THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM reservation_table rt
        JOIN reservation r ON r.id = rt.reservation_id
        WHERE rt.table_id = NEW.table_id
          AND r.status IN ('CONFIRMED', 'SEATED')
          AND r.start_at_utc < current_hold.end_at_utc
          AND r.end_at_utc > current_hold.start_at_utc
    ) THEN
        RAISE EXCEPTION 'Table % is already reserved for an overlapping time slot', NEW.table_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM hold_table ht
        JOIN hold h ON h.id = ht.hold_id
        WHERE ht.table_id = NEW.table_id
          AND ht.hold_id <> NEW.hold_id
          AND h.confirmed = false
          AND h.expires_at_utc > (NOW() AT TIME ZONE 'UTC')
          AND h.start_at_utc < current_hold.end_at_utc
          AND h.end_at_utc > current_hold.start_at_utc
    ) THEN
        RAISE EXCEPTION 'Table % is already held for an overlapping time slot', NEW.table_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservation_table_no_overlap ON reservation_table;
CREATE TRIGGER trg_reservation_table_no_overlap
BEFORE INSERT OR UPDATE ON reservation_table
FOR EACH ROW
EXECUTE FUNCTION enforce_reservation_table_no_overlap();

DROP TRIGGER IF EXISTS trg_hold_table_no_overlap ON hold_table;
CREATE TRIGGER trg_hold_table_no_overlap
BEFORE INSERT OR UPDATE ON hold_table
FOR EACH ROW
EXECUTE FUNCTION enforce_hold_table_no_overlap();
