-- Removes V1 demo seed data when seed_demo_data is false.
-- Dev profile keeps seed data by setting spring.flyway.placeholders.seed_demo_data=true.
DO $$
DECLARE
    keep_seed BOOLEAN := LOWER('${seed_demo_data}') = 'true';
BEGIN
    IF keep_seed THEN
        RAISE NOTICE 'Demo seed cleanup skipped (seed_demo_data=true)';
        RETURN;
    END IF;

    -- Remove records tied to the seeded demo restaurant first to satisfy FKs.
    DELETE FROM reservation_table
    WHERE reservation_id IN (
        SELECT id FROM reservation
        WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant')
    );

    DELETE FROM hold_table
    WHERE hold_id IN (
        SELECT id FROM hold
        WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant')
    );

    DELETE FROM table_combination_member
    WHERE combination_id IN (
        SELECT id FROM table_combination
        WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant')
    )
       OR table_id IN (
        SELECT id FROM dining_table
        WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant')
    );

    DELETE FROM reservation
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM hold
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM vacation
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM table_combination
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM dining_table
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM shift
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM opening_hours
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM staff_invite
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM audit_event
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM email_send_log
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM user_restaurant
    WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant');

    DELETE FROM restaurant
    WHERE slug = 'demo-restaurant';

    -- Remove the seeded demo user if it no longer belongs to any restaurant.
    DELETE FROM refresh_token
    WHERE user_id IN (SELECT id FROM user_account WHERE email = 'admin@demo.com');

    DELETE FROM password_reset
    WHERE user_id IN (SELECT id FROM user_account WHERE email = 'admin@demo.com');

    DELETE FROM user_account
    WHERE email = 'admin@demo.com'
      AND NOT EXISTS (
        SELECT 1
        FROM user_restaurant ur
        WHERE ur.user_id = user_account.id
    );

    RAISE NOTICE 'Demo seed cleanup applied for non-dev environment';
END $$;
