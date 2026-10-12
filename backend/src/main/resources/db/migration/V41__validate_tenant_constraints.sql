DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_reservation_table_same_restaurant'
    ) THEN
        ALTER TABLE reservation_table VALIDATE CONSTRAINT ck_reservation_table_same_restaurant;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_hold_table_same_restaurant'
    ) THEN
        ALTER TABLE hold_table VALIDATE CONSTRAINT ck_hold_table_same_restaurant;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_ssa_shift_same_restaurant'
    ) THEN
        ALTER TABLE staff_shift_assignment VALIDATE CONSTRAINT ck_ssa_shift_same_restaurant;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_ssa_user_in_restaurant'
    ) THEN
        ALTER TABLE staff_shift_assignment VALIDATE CONSTRAINT ck_ssa_user_in_restaurant;
    END IF;
END
$$;
