-- Block reservation_table rows where the table belongs to a different restaurant
-- than the reservation. Uses NOT VALID / VALIDATE pattern for zero-downtime rollout.

CREATE OR REPLACE FUNCTION reservation_table_same_restaurant(
  p_reservation_id BIGINT,
  p_table_id       BIGINT
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM reservation r
    JOIN dining_table t ON t.id = p_table_id
    WHERE r.id = p_reservation_id
      AND r.restaurant_id = t.restaurant_id
  );
$$;

ALTER TABLE reservation_table
  ADD CONSTRAINT ck_reservation_table_same_restaurant
  CHECK (reservation_table_same_restaurant(reservation_id, table_id))
  NOT VALID;

-- Run VALIDATE CONSTRAINT in a separate migration during a low-traffic window:
-- ALTER TABLE reservation_table VALIDATE CONSTRAINT ck_reservation_table_same_restaurant;

-- Block hold_table rows where the table belongs to a different restaurant than the hold.

CREATE OR REPLACE FUNCTION hold_table_same_restaurant(
  p_hold_id  BIGINT,
  p_table_id BIGINT
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hold h
    JOIN dining_table t ON t.id = p_table_id
    WHERE h.id = p_hold_id
      AND h.restaurant_id = t.restaurant_id
  );
$$;

ALTER TABLE hold_table
  ADD CONSTRAINT ck_hold_table_same_restaurant
  CHECK (hold_table_same_restaurant(hold_id, table_id))
  NOT VALID;

-- ALTER TABLE hold_table VALIDATE CONSTRAINT ck_hold_table_same_restaurant;
