-- Ensure staff_shift_assignment.shift_id belongs to the same restaurant.

CREATE OR REPLACE FUNCTION ssa_shift_same_restaurant(
  p_shift_id       BIGINT,
  p_restaurant_id  BIGINT
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM shift
    WHERE id = p_shift_id AND restaurant_id = p_restaurant_id
  );
$$;

ALTER TABLE staff_shift_assignment
  ADD CONSTRAINT ck_ssa_shift_same_restaurant
  CHECK (ssa_shift_same_restaurant(shift_id, restaurant_id))
  NOT VALID;

-- Ensure the assigned user is a member of the restaurant.

CREATE OR REPLACE FUNCTION ssa_user_in_restaurant(
  p_user_id       BIGINT,
  p_restaurant_id BIGINT
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_restaurant
    WHERE user_id = p_user_id AND restaurant_id = p_restaurant_id
  );
$$;

ALTER TABLE staff_shift_assignment
  ADD CONSTRAINT ck_ssa_user_in_restaurant
  CHECK (ssa_user_in_restaurant(user_id, restaurant_id))
  NOT VALID;
