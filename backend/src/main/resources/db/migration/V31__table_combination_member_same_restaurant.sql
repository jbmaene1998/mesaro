-- Ensure every table in a table_combination belongs to the same restaurant
-- as the combination itself.

CREATE OR REPLACE FUNCTION tcm_table_same_restaurant(
  p_combination_id BIGINT,
  p_table_id       BIGINT
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM table_combination tc
    JOIN dining_table dt ON dt.id = p_table_id
    WHERE tc.id = p_combination_id
      AND tc.restaurant_id = dt.restaurant_id
  );
$$;

ALTER TABLE table_combination_member
  ADD CONSTRAINT ck_tcm_same_restaurant
  CHECK (tcm_table_same_restaurant(combination_id, table_id))
  NOT VALID;
