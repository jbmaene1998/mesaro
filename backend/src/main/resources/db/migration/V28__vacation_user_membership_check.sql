-- Ensure STAFF_VACATION rows reference a user who is a member of the restaurant.

CREATE OR REPLACE FUNCTION vacation_user_in_restaurant(
  p_user_id       BIGINT,
  p_restaurant_id BIGINT,
  p_type          VARCHAR
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_type = 'STAFF_VACATION' THEN
      EXISTS (
        SELECT 1 FROM user_restaurant
        WHERE user_id = p_user_id AND restaurant_id = p_restaurant_id
      )
    ELSE TRUE
  END;
$$;

ALTER TABLE vacation
  ADD CONSTRAINT ck_vacation_user_in_restaurant
  CHECK (vacation_user_in_restaurant(user_id, restaurant_id, type))
  NOT VALID;
