DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_ssa_user_restaurant'
    ) THEN
        ALTER TABLE staff_shift_assignment
            ADD CONSTRAINT fk_ssa_user_restaurant
            FOREIGN KEY (user_id, restaurant_id)
            REFERENCES user_restaurant (user_id, restaurant_id)
            ON DELETE RESTRICT;
    END IF;
END
$$;
