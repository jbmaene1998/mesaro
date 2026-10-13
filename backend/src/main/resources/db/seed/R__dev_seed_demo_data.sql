-- Dev-only seed data.
-- Loaded only when spring.flyway.locations includes classpath:db/seed (dev profile).

-- -----------------------------------------------------------------------------
-- Demo restaurants (tenants)
-- -----------------------------------------------------------------------------
INSERT INTO restaurant (
    name,
    slug,
    timezone,
    locale,
    booking_enabled,
    slot_interval_minutes,
    default_duration_minutes,
    min_notice_minutes,
    max_advance_days,
    max_party_size,
    assignment_mode
)
VALUES
    ('Bonita Calle Larios', 'demo-restaurant', 'Europe/Brussels', 'es-ES', true, 15, 90, 30, 90, 20, 'AUTO'),
    ('Bonita Avenida de Barcelona', 'demo-terrace', 'Europe/Brussels', 'en-US', true, 15, 90, 60, 60, 12, 'AUTO')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Dining tables
-- -----------------------------------------------------------------------------
WITH seed_tables AS (
    SELECT slug, label, seats
    FROM (
        VALUES
            ('demo-restaurant', 'T1', 2),
            ('demo-restaurant', 'T2', 2),
            ('demo-restaurant', 'T3', 4),
            ('demo-restaurant', 'T4', 4),
            ('demo-restaurant', 'T5', 6),
            ('demo-restaurant', 'T6', 6),
            ('demo-restaurant', 'T7', 8),
            ('demo-restaurant', 'Bar1', 2),
            ('demo-restaurant', 'Bar2', 2),
            ('demo-terrace', 'A1', 2),
            ('demo-terrace', 'A2', 2),
            ('demo-terrace', 'B1', 4),
            ('demo-terrace', 'B2', 4),
            ('demo-terrace', 'P1', 6),
            ('demo-terrace', 'P2', 6),
            ('demo-terrace', 'Lounge1', 4),
            ('demo-terrace', 'Lounge2', 4)
    ) AS rows(slug, label, seats)
)
INSERT INTO dining_table (restaurant_id, label, seats)
SELECT r.id, st.label, st.seats
FROM seed_tables st
JOIN restaurant r ON r.slug = st.slug
ON CONFLICT (restaurant_id, label) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Shifts
-- -----------------------------------------------------------------------------
WITH
seed_shifts AS (
    SELECT
        slug,
        shift_name,
        dow,
        start_time,
        end_time,
        last_reservation_time,
        max_covers
    FROM (
        VALUES
            ('demo-restaurant', 'Lunch', 1, '11:30'::time, '14:30'::time, '13:30'::time, 30),
            ('demo-restaurant', 'Lunch', 2, '11:30'::time, '14:30'::time, '13:30'::time, 30),
            ('demo-restaurant', 'Lunch', 3, '11:30'::time, '14:30'::time, '13:30'::time, 30),
            ('demo-restaurant', 'Lunch', 4, '11:30'::time, '14:30'::time, '13:30'::time, 30),
            ('demo-restaurant', 'Lunch', 5, '11:30'::time, '14:30'::time, '13:30'::time, 40),
            ('demo-restaurant', 'Lunch', 6, '11:30'::time, '14:30'::time, '13:30'::time, 40),
            ('demo-restaurant', 'Lunch', 7, '11:30'::time, '14:30'::time, '13:30'::time, 40),
            ('demo-restaurant', 'Dinner', 1, '18:00'::time, '22:00'::time, '21:00'::time, 40),
            ('demo-restaurant', 'Dinner', 2, '18:00'::time, '22:00'::time, '21:00'::time, 40),
            ('demo-restaurant', 'Dinner', 3, '18:00'::time, '22:00'::time, '21:00'::time, 40),
            ('demo-restaurant', 'Dinner', 4, '18:00'::time, '22:00'::time, '21:00'::time, 40),
            ('demo-restaurant', 'Dinner', 5, '18:00'::time, '22:00'::time, '21:00'::time, 50),
            ('demo-restaurant', 'Dinner', 6, '18:00'::time, '22:00'::time, '21:00'::time, 50),
            ('demo-restaurant', 'Dinner', 7, '18:00'::time, '22:00'::time, '21:00'::time, 50),
            ('demo-terrace', 'Sunset', 2, '17:30'::time, '22:30'::time, '21:30'::time, 24),
            ('demo-terrace', 'Sunset', 3, '17:30'::time, '22:30'::time, '21:30'::time, 24),
            ('demo-terrace', 'Sunset', 4, '17:30'::time, '22:30'::time, '21:30'::time, 24),
            ('demo-terrace', 'Sunset', 5, '17:30'::time, '23:00'::time, '22:00'::time, 32),
            ('demo-terrace', 'Sunset', 6, '17:30'::time, '23:00'::time, '22:00'::time, 36),
            ('demo-terrace', 'Brunch', 6, '10:00'::time, '14:00'::time, '13:00'::time, 20),
            ('demo-terrace', 'Brunch', 7, '10:00'::time, '14:00'::time, '13:00'::time, 20)
    ) AS s(slug, shift_name, dow, start_time, end_time, last_reservation_time, max_covers)
)
INSERT INTO shift (restaurant_id, name, day_of_week, start_time, end_time, last_reservation_time, max_covers, status)
SELECT r.id, ss.shift_name, ss.dow, ss.start_time, ss.end_time, ss.last_reservation_time, ss.max_covers, 'ACTIVE'
FROM seed_shifts ss
JOIN restaurant r ON r.slug = ss.slug
WHERE NOT EXISTS (
    SELECT 1
    FROM shift sh
    WHERE sh.restaurant_id = r.id
      AND sh.name = ss.shift_name
      AND sh.day_of_week = ss.dow
      AND sh.start_time = ss.start_time
      AND sh.end_time = ss.end_time
      AND sh.last_reservation_time = ss.last_reservation_time
);

-- -----------------------------------------------------------------------------
-- Table combinations
-- -----------------------------------------------------------------------------
DELETE FROM table_combination_member
WHERE combination_id IN (
    SELECT tc.id
    FROM table_combination tc
    JOIN restaurant r ON r.id = tc.restaurant_id
    WHERE r.slug = 'demo-restaurant'
      AND tc.name LIKE 'Seed:%'
);

DELETE FROM table_combination
WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant')
  AND name LIKE 'Seed:%';

WITH demo_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-restaurant'
),
seed_combinations AS (
    SELECT demo_rest.id AS restaurant_id, name, min_capacity, max_capacity
    FROM demo_rest,
         (VALUES
             ('Seed: Couple Pair (T1+T2)', 2, 4),
             ('Seed: Family (T3+T4)', 6, 8),
             ('Seed: Group (T5+T6)', 10, 12)
         ) AS c(name, min_capacity, max_capacity)
)
INSERT INTO table_combination (restaurant_id, name, min_capacity, max_capacity)
SELECT restaurant_id, name, min_capacity, max_capacity
FROM seed_combinations
ON CONFLICT (restaurant_id, name) DO UPDATE
SET min_capacity = EXCLUDED.min_capacity,
    max_capacity = EXCLUDED.max_capacity;

WITH demo_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-restaurant'
),
seed_combo_members AS (
    SELECT combo_name, table_label
    FROM (
        VALUES
            ('Seed: Couple Pair (T1+T2)', 'T1'),
            ('Seed: Couple Pair (T1+T2)', 'T2'),
            ('Seed: Family (T3+T4)', 'T3'),
            ('Seed: Family (T3+T4)', 'T4'),
            ('Seed: Group (T5+T6)', 'T5'),
            ('Seed: Group (T5+T6)', 'T6')
    ) AS m(combo_name, table_label)
)
INSERT INTO table_combination_member (combination_id, table_id)
SELECT tc.id, dt.id
FROM seed_combo_members m
JOIN demo_rest dr ON TRUE
JOIN table_combination tc ON tc.restaurant_id = dr.id AND tc.name = m.combo_name
JOIN dining_table dt ON dt.restaurant_id = dr.id AND dt.label = m.table_label
ON CONFLICT (combination_id, table_id) DO NOTHING;

DELETE FROM table_combination_member
WHERE combination_id IN (
    SELECT tc.id
    FROM table_combination tc
    JOIN restaurant r ON r.id = tc.restaurant_id
    WHERE r.slug = 'demo-terrace'
      AND tc.name LIKE 'Seed:%'
);

DELETE FROM table_combination
WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-terrace')
  AND name LIKE 'Seed:%';

WITH terrace_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-terrace'
),
terrace_combinations AS (
    SELECT terrace_rest.id AS restaurant_id, name, min_capacity, max_capacity
    FROM terrace_rest,
         (VALUES
             ('Seed: Terrace Duo (A1+A2)', 2, 4),
             ('Seed: Patio Party (P1+P2)', 10, 12),
             ('Seed: Lounge Cluster (Lounge1+Lounge2)', 6, 8)
         ) AS c(name, min_capacity, max_capacity)
)
INSERT INTO table_combination (restaurant_id, name, min_capacity, max_capacity)
SELECT restaurant_id, name, min_capacity, max_capacity
FROM terrace_combinations
ON CONFLICT (restaurant_id, name) DO UPDATE
SET min_capacity = EXCLUDED.min_capacity,
    max_capacity = EXCLUDED.max_capacity;

WITH terrace_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-terrace'
),
terrace_combo_members AS (
    SELECT combo_name, table_label
    FROM (
        VALUES
            ('Seed: Terrace Duo (A1+A2)', 'A1'),
            ('Seed: Terrace Duo (A1+A2)', 'A2'),
            ('Seed: Patio Party (P1+P2)', 'P1'),
            ('Seed: Patio Party (P1+P2)', 'P2'),
            ('Seed: Lounge Cluster (Lounge1+Lounge2)', 'Lounge1'),
            ('Seed: Lounge Cluster (Lounge1+Lounge2)', 'Lounge2')
    ) AS m(combo_name, table_label)
)
INSERT INTO table_combination_member (combination_id, table_id)
SELECT tc.id, dt.id
FROM terrace_combo_members m
JOIN terrace_rest tr ON TRUE
JOIN table_combination tc ON tc.restaurant_id = tr.id AND tc.name = m.combo_name
JOIN dining_table dt ON dt.restaurant_id = tr.id AND dt.label = m.table_label
ON CONFLICT (combination_id, table_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Demo user and membership
-- -----------------------------------------------------------------------------
INSERT INTO user_account (email, password_hash, enabled, max_restaurants)
VALUES ('admin@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 2)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    enabled = EXCLUDED.enabled,
    max_restaurants = GREATEST(user_account.max_restaurants, EXCLUDED.max_restaurants);

-- Demo OWNER has two active restaurants; keep quota aligned with seed inventory.
UPDATE user_account
SET max_restaurants = GREATEST(max_restaurants, 2)
WHERE email = 'admin@demo.com';

WITH demo_rest AS (SELECT id FROM restaurant WHERE slug IN ('demo-restaurant', 'demo-terrace')),
     demo_user AS (SELECT id FROM user_account WHERE email = 'admin@demo.com')
INSERT INTO user_restaurant (user_id, restaurant_id, role)
SELECT demo_user.id, demo_rest.id, 'OWNER'
FROM demo_user, demo_rest
ON CONFLICT (user_id, restaurant_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Additional demo users (for role-based UI testing)
-- -----------------------------------------------------------------------------
INSERT INTO user_account (email, password_hash, enabled, full_name)
VALUES
    ('manager.demo@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Alex Romero'),
    ('staff.demo@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Noa Garcia'),
    ('host.demo@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Luna Ortega'),
    ('server1.demo@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Mateo Ruiz'),
    ('server2.demo@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Iris Vidal'),
    ('bartender.demo@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Sergio Costa'),
    ('manager.terrace@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Emma Navarro'),
    ('staff.terrace@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Leo Campos'),
    ('host.terrace@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Aina Serrano'),
    ('server1.terrace@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Bruno Molina'),
    ('server2.terrace@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Sara Delgado'),
    ('runner.terrace@demo.com', '$2a$10$eCalHosZDgLgBUP7juq0Re3j/6ShX3HsDS8CXeqDZWS0y1WkLqWP2', true, 'Pol Fuentes')
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    enabled = EXCLUDED.enabled,
    full_name = EXCLUDED.full_name;

WITH seed_users AS (
    SELECT id
    FROM user_account
    WHERE email IN (
        'manager.demo@demo.com',
        'staff.demo@demo.com',
        'host.demo@demo.com',
        'server1.demo@demo.com',
        'server2.demo@demo.com',
        'bartender.demo@demo.com',
        'manager.terrace@demo.com',
        'staff.terrace@demo.com',
        'host.terrace@demo.com',
        'server1.terrace@demo.com',
        'server2.terrace@demo.com',
        'runner.terrace@demo.com'
    )
)
DELETE FROM staff_shift_assignment ssa
USING seed_users su
WHERE ssa.user_id = su.id;

WITH seed_users AS (
    SELECT id
    FROM user_account
    WHERE email IN (
        'manager.demo@demo.com',
        'staff.demo@demo.com',
        'host.demo@demo.com',
        'server1.demo@demo.com',
        'server2.demo@demo.com',
        'bartender.demo@demo.com',
        'manager.terrace@demo.com',
        'staff.terrace@demo.com',
        'host.terrace@demo.com',
        'server1.terrace@demo.com',
        'server2.terrace@demo.com',
        'runner.terrace@demo.com'
    )
)
DELETE FROM staff_weekly_work_hours swh
USING seed_users su
WHERE swh.user_id = su.id;

DELETE FROM user_restaurant
WHERE user_id IN (
    SELECT id FROM user_account WHERE email IN (
        'manager.demo@demo.com',
        'staff.demo@demo.com',
        'host.demo@demo.com',
        'server1.demo@demo.com',
        'server2.demo@demo.com',
        'bartender.demo@demo.com',
        'manager.terrace@demo.com',
        'staff.terrace@demo.com',
        'host.terrace@demo.com',
        'server1.terrace@demo.com',
        'server2.terrace@demo.com',
        'runner.terrace@demo.com'
    )
);

WITH demo_rest AS (SELECT id FROM restaurant WHERE slug = 'demo-restaurant')
INSERT INTO user_restaurant (user_id, restaurant_id, role)
SELECT u.id, r.id, role
FROM demo_rest r
JOIN (
    SELECT id, 'MANAGER'::varchar AS role FROM user_account WHERE email = 'manager.demo@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'staff.demo@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'host.demo@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'server1.demo@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'server2.demo@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'bartender.demo@demo.com'
) u ON TRUE
ON CONFLICT (user_id, restaurant_id) DO NOTHING;

WITH terrace_rest AS (SELECT id FROM restaurant WHERE slug = 'demo-terrace')
INSERT INTO user_restaurant (user_id, restaurant_id, role)
SELECT u.id, r.id, role
FROM terrace_rest r
JOIN (
    SELECT id, 'MANAGER'::varchar AS role FROM user_account WHERE email = 'manager.terrace@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'staff.terrace@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'host.terrace@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'server1.terrace@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'server2.terrace@demo.com'
    UNION ALL
    SELECT id, 'STAFF'::varchar AS role FROM user_account WHERE email = 'runner.terrace@demo.com'
) u ON TRUE
ON CONFLICT (user_id, restaurant_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Staff planning seed data (assignments + weekly planned hours)
-- -----------------------------------------------------------------------------
WITH seed_users AS (
    SELECT id
    FROM user_account
    WHERE email IN (
        'manager.demo@demo.com',
        'staff.demo@demo.com',
        'host.demo@demo.com',
        'server1.demo@demo.com',
        'server2.demo@demo.com',
        'bartender.demo@demo.com',
        'manager.terrace@demo.com',
        'staff.terrace@demo.com',
        'host.terrace@demo.com',
        'server1.terrace@demo.com',
        'server2.terrace@demo.com',
        'runner.terrace@demo.com'
    )
)
DELETE FROM staff_shift_assignment ssa
USING seed_users su
WHERE ssa.user_id = su.id
  AND ssa.service_date BETWEEN (CURRENT_DATE - INTERVAL '14 day')::date AND (CURRENT_DATE + INTERVAL '28 day')::date;

WITH seed_users AS (
    SELECT id
    FROM user_account
    WHERE email IN (
        'manager.demo@demo.com',
        'staff.demo@demo.com',
        'host.demo@demo.com',
        'server1.demo@demo.com',
        'server2.demo@demo.com',
        'bartender.demo@demo.com',
        'manager.terrace@demo.com',
        'staff.terrace@demo.com',
        'host.terrace@demo.com',
        'server1.terrace@demo.com',
        'server2.terrace@demo.com',
        'runner.terrace@demo.com'
    )
)
DELETE FROM staff_weekly_work_hours swh
USING seed_users su
WHERE swh.user_id = su.id
  AND swh.week_start_date BETWEEN (CURRENT_DATE - INTERVAL '14 day')::date AND (CURRENT_DATE + INTERVAL '21 day')::date;

WITH week_anchor AS (
    SELECT date_trunc('week', CURRENT_DATE)::date AS monday
),
target_weeks AS (
    SELECT monday AS week_start_date FROM week_anchor
    UNION ALL
    SELECT (monday + INTERVAL '7 day')::date FROM week_anchor
),
target_hours AS (
    SELECT * FROM (
        VALUES
            ('demo-restaurant', 'manager.demo@demo.com', 42.0::numeric),
            ('demo-restaurant', 'staff.demo@demo.com', 36.0::numeric),
            ('demo-restaurant', 'host.demo@demo.com', 30.0::numeric),
            ('demo-restaurant', 'server1.demo@demo.com', 32.0::numeric),
            ('demo-restaurant', 'server2.demo@demo.com', 28.0::numeric),
            ('demo-restaurant', 'bartender.demo@demo.com', 34.0::numeric),
            ('demo-terrace', 'manager.terrace@demo.com', 40.0::numeric),
            ('demo-terrace', 'staff.terrace@demo.com', 34.0::numeric),
            ('demo-terrace', 'host.terrace@demo.com', 24.0::numeric),
            ('demo-terrace', 'server1.terrace@demo.com', 30.0::numeric),
            ('demo-terrace', 'server2.terrace@demo.com', 30.0::numeric),
            ('demo-terrace', 'runner.terrace@demo.com', 26.0::numeric)
    ) AS rows(slug, email, planned_hours)
)
INSERT INTO staff_weekly_work_hours (restaurant_id, user_id, week_start_date, planned_hours)
SELECT r.id, u.id, tw.week_start_date, th.planned_hours
FROM target_hours th
JOIN restaurant r ON r.slug = th.slug
JOIN user_account u ON u.email = th.email
CROSS JOIN target_weeks tw
ON CONFLICT (restaurant_id, user_id, week_start_date) DO UPDATE
SET planned_hours = EXCLUDED.planned_hours,
    updated_at_utc = (NOW() AT TIME ZONE 'UTC');

WITH planning_days AS (
    SELECT gs::date AS service_date
    FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '20 day', INTERVAL '1 day') gs
),
shift_instances AS (
    SELECT
        r.id AS restaurant_id,
        s.id AS shift_id,
        s.name AS shift_name,
        pd.service_date
    FROM planning_days pd
    JOIN restaurant r ON r.slug IN ('demo-restaurant', 'demo-terrace')
    JOIN shift s ON s.restaurant_id = r.id
                AND s.status = 'ACTIVE'
                AND s.day_of_week = EXTRACT(ISODOW FROM pd.service_date)::int
),
assignment_targets AS (
    SELECT restaurant_id, shift_id, service_date, assigned_email
    FROM (
        SELECT
            si.restaurant_id,
            si.shift_id,
            si.service_date,
            CASE
                WHEN r.slug = 'demo-restaurant' AND si.shift_name = 'Lunch' THEN 'host.demo@demo.com'
                WHEN r.slug = 'demo-restaurant' AND si.shift_name = 'Dinner' THEN 'bartender.demo@demo.com'
                WHEN r.slug = 'demo-terrace' AND si.shift_name = 'Brunch' THEN 'host.terrace@demo.com'
                WHEN r.slug = 'demo-terrace' AND si.shift_name = 'Sunset' THEN 'staff.terrace@demo.com'
                ELSE NULL
            END AS assigned_email
        FROM shift_instances si
        JOIN restaurant r ON r.id = si.restaurant_id

        UNION ALL

        SELECT
            si.restaurant_id,
            si.shift_id,
            si.service_date,
            CASE
                WHEN r.slug = 'demo-restaurant' AND si.shift_name = 'Lunch' THEN 'server1.demo@demo.com'
                WHEN r.slug = 'demo-restaurant' AND si.shift_name = 'Dinner' THEN 'server2.demo@demo.com'
                WHEN r.slug = 'demo-terrace' AND si.shift_name = 'Brunch' THEN 'server1.terrace@demo.com'
                WHEN r.slug = 'demo-terrace' AND si.shift_name = 'Sunset' THEN 'server2.terrace@demo.com'
                ELSE NULL
            END AS assigned_email
        FROM shift_instances si
        JOIN restaurant r ON r.id = si.restaurant_id

        UNION ALL

        SELECT
            si.restaurant_id,
            si.shift_id,
            si.service_date,
            CASE
                WHEN r.slug = 'demo-restaurant' AND si.shift_name = 'Dinner' THEN 'staff.demo@demo.com'
                WHEN r.slug = 'demo-terrace' AND si.shift_name = 'Sunset' THEN 'runner.terrace@demo.com'
                ELSE NULL
            END AS assigned_email
        FROM shift_instances si
        JOIN restaurant r ON r.id = si.restaurant_id
    ) rows
    WHERE assigned_email IS NOT NULL
)
INSERT INTO staff_shift_assignment (
    restaurant_id,
    shift_id,
    user_id,
    service_date,
    planned_start_local_time,
    planned_end_local_time
)
SELECT
    at.restaurant_id,
    at.shift_id,
    ua.id,
    at.service_date,
    s.start_time,
    s.end_time
FROM assignment_targets at
JOIN user_account ua ON ua.email = at.assigned_email
JOIN shift s ON s.id = at.shift_id
ON CONFLICT (shift_id, user_id, service_date) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Pending staff invite for invite workflow demo
-- -----------------------------------------------------------------------------
DELETE FROM staff_invite
WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-restaurant')
  AND email = 'seed.invite.pending@demo.com'
  AND accepted_at_utc IS NULL
  AND revoked_at_utc IS NULL;

WITH demo_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-restaurant'
),
demo_owner AS (
    SELECT id FROM user_account WHERE email = 'admin@demo.com'
)
INSERT INTO staff_invite (
    restaurant_id,
    email,
    role,
    token_hash,
    expires_at_utc,
    invited_by_user_id
)
SELECT
    dr.id,
    'seed.invite.pending@demo.com',
    'STAFF',
    lpad(md5('seed.invite.pending@demo.com:' || dr.id::text), 64, '0'),
    (NOW() AT TIME ZONE 'UTC') + INTERVAL '48 hours',
    du.id
FROM demo_rest dr
CROSS JOIN demo_owner du
ON CONFLICT (token_hash) DO NOTHING;

DELETE FROM staff_invite
WHERE restaurant_id IN (SELECT id FROM restaurant WHERE slug = 'demo-terrace')
  AND email = 'seed.invite.terrace.pending@demo.com'
  AND accepted_at_utc IS NULL
  AND revoked_at_utc IS NULL;

WITH terrace_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-terrace'
),
demo_owner AS (
    SELECT id FROM user_account WHERE email = 'admin@demo.com'
)
INSERT INTO staff_invite (
    restaurant_id,
    email,
    role,
    token_hash,
    expires_at_utc,
    invited_by_user_id
)
SELECT
    tr.id,
    'seed.invite.terrace.pending@demo.com',
    'MANAGER',
    lpad(md5('seed.invite.terrace.pending@demo.com:' || tr.id::text), 64, '0'),
    (NOW() AT TIME ZONE 'UTC') + INTERVAL '72 hours',
    du.id
FROM terrace_rest tr
CROSS JOIN demo_owner du
ON CONFLICT (token_hash) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Future/past reservations for visible dashboard and list testing
-- -----------------------------------------------------------------------------
DELETE FROM reservation_table
WHERE reservation_id IN (
    SELECT id FROM reservation WHERE guest_email LIKE 'seed.%@demo.com'
);

DELETE FROM reservation
WHERE guest_email LIKE 'seed.%@demo.com';

WITH demo_rest AS (
    SELECT id, timezone FROM restaurant WHERE slug = 'demo-restaurant'
),
seed_reservations AS (
    SELECT
        code,
        guest_name,
        guest_email,
        guest_phone,
        party_size,
        start_at_utc,
        end_at_utc,
        shift_name,
        status,
        notes
    FROM (
        VALUES
            (
                'DEMO-FUT-001',
                'Future Guest One',
                'seed.future.1@demo.com',
                '+32470000001',
                2,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day 18 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day 19 hours 30 minutes',
                'Dinner',
                'CONFIRMED',
                'Seed: tomorrow dinner'
            ),
            (
                'DEMO-FUT-002',
                'Future Guest Two',
                'seed.future.2@demo.com',
                '+32470000002',
                4,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '2 days 12 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '2 days 13 hours 30 minutes',
                'Lunch',
                'CONFIRMED',
                'Seed: upcoming lunch'
            ),
            (
                'DEMO-NOW-001',
                'Seated Guest',
                'seed.now.1@demo.com',
                '+32470000003',
                2,
                (NOW() AT TIME ZONE 'UTC') - INTERVAL '15 minutes',
                (NOW() AT TIME ZONE 'UTC') + INTERVAL '75 minutes',
                'Dinner',
                'SEATED',
                'Seed: active seated reservation'
            ),
            (
                'DEMO-PAST-001',
                'Completed Guest',
                'seed.past.1@demo.com',
                '+32470000004',
                4,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day' + INTERVAL '18 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day' + INTERVAL '19 hours 30 minutes',
                'Dinner',
                'COMPLETED',
                'Seed: completed yesterday'
            ),
            (
                'DEMO-PAST-002',
                'No Show Guest',
                'seed.past.2@demo.com',
                '+32470000005',
                3,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '2 days' + INTERVAL '12 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '2 days' + INTERVAL '13 hours 30 minutes',
                'Lunch',
                'NO_SHOW',
                'Seed: no show example'
            ),
            (
                'DEMO-CAN-001',
                'Cancelled Guest',
                'seed.past.3@demo.com',
                '+32470000006',
                2,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '3 days 18 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '3 days 19 hours 30 minutes',
                'Dinner',
                'CANCELLED',
                'Seed: cancelled example'
            )
    ) AS base_rows(code, guest_name, guest_email, guest_phone, party_size, start_at_utc, end_at_utc, shift_name, status, notes)
    UNION ALL
    SELECT
        format('DEMO-BULK-%s', lpad(bs.n::text, 3, '0')) AS code,
        format('Bulk Guest %s', bs.n) AS guest_name,
        format('seed.bulk.%s@demo.com', bs.n) AS guest_email,
        '+3247' || lpad(bs.n::text, 7, '0') AS guest_phone,
        2 + (bs.n % 7) AS party_size,
        ((bs.service_date::timestamp + bs.slot_start_local) AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'UTC' AS start_at_utc,
        (((bs.service_date::timestamp + bs.slot_start_local) AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'UTC') + INTERVAL '90 minutes' AS end_at_utc,
        bs.shift_name,
        CASE
            WHEN bs.n % 10 = 0 THEN 'CANCELLED'
            WHEN bs.n % 9 = 0 THEN 'NO_SHOW'
            WHEN bs.n % 8 = 0 THEN 'COMPLETED'
            WHEN bs.n % 7 = 0 THEN 'SEATED'
            ELSE 'CONFIRMED'
        END AS status,
        format('Seed bulk reservation #%s', bs.n) AS notes
    FROM (
        SELECT
            slot_rows.service_date,
            slot_rows.shift_name,
            slot_rows.slot_start_local,
            row_number() OVER (ORDER BY slot_rows.service_date, slot_rows.shift_name, slot_rows.slot_start_local) AS n
        FROM (
            SELECT
                d.service_date,
                s.shift_name,
                s.slot_start_local
            FROM (
                SELECT gs::date AS service_date
                FROM generate_series(CURRENT_DATE - INTERVAL '21 day', CURRENT_DATE + INTERVAL '21 day', INTERVAL '1 day') gs
                WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 6
            ) d
            CROSS JOIN (
                VALUES
                    ('Lunch', '11:45'::time),
                    ('Lunch', '12:30'::time),
                    ('Dinner', '18:00'::time),
                    ('Dinner', '19:15'::time)
            ) AS s(shift_name, slot_start_local)
        ) slot_rows
    ) bs
    WHERE bs.n <= 64
)
INSERT INTO reservation (
    restaurant_id,
    shift_id,
    confirmation_code,
    guest_name,
    guest_email,
    guest_phone,
    party_size,
    start_at_utc,
    end_at_utc,
    status,
    cancel_token_hash,
    cancel_token_expires_at_utc,
    notes
)
SELECT
    r.id,
    sh.id,
    sr.code,
    sr.guest_name,
    sr.guest_email,
    sr.guest_phone,
    sr.party_size,
    sr.start_at_utc,
    sr.end_at_utc,
    sr.status,
    lpad(md5('seed:demo-restaurant:' || sr.code), 64, '0'),
    (NOW() AT TIME ZONE 'UTC') + INTERVAL '30 days',
    sr.notes
FROM seed_reservations sr
CROSS JOIN demo_rest r
LEFT JOIN LATERAL (
    SELECT s.id
    FROM shift s
    WHERE s.restaurant_id = r.id
      AND s.name = sr.shift_name
      AND s.day_of_week = EXTRACT(ISODOW FROM (sr.start_at_utc AT TIME ZONE r.timezone))::int
    ORDER BY s.start_time
    LIMIT 1
) sh ON TRUE;

WITH demo_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-restaurant'
),
seed_table_map AS (
    SELECT
        code,
        table_label
    FROM (
        VALUES
            ('DEMO-FUT-001', 'T1'),
            ('DEMO-FUT-002', 'T3'),
            ('DEMO-NOW-001', 'Bar1'),
            ('DEMO-PAST-001', 'T4'),
            ('DEMO-PAST-002', 'T5'),
            ('DEMO-CAN-001', 'T2')
    ) AS t(code, table_label)
    UNION ALL
    SELECT
        format('DEMO-BULK-%s', lpad(n::text, 3, '0')) AS code,
        CASE (n % 9)
            WHEN 1 THEN 'T1'
            WHEN 2 THEN 'T2'
            WHEN 3 THEN 'T3'
            WHEN 4 THEN 'T4'
            WHEN 5 THEN 'T5'
            WHEN 6 THEN 'T6'
            WHEN 7 THEN 'T7'
            WHEN 8 THEN 'Bar1'
            ELSE 'Bar2'
        END AS table_label
    FROM generate_series(1, 64) AS n
)
INSERT INTO reservation_table (reservation_id, table_id)
SELECT res.id, dt.id
FROM seed_table_map stm
JOIN reservation res ON res.confirmation_code = stm.code
JOIN demo_rest dr ON res.restaurant_id = dr.id
JOIN dining_table dt ON dt.restaurant_id = dr.id AND dt.label = stm.table_label;

WITH terrace_rest AS (
    SELECT id, timezone FROM restaurant WHERE slug = 'demo-terrace'
),
terrace_reservations AS (
    SELECT
        code,
        guest_name,
        guest_email,
        guest_phone,
        party_size,
        start_at_utc,
        end_at_utc,
        shift_name,
        status,
        notes
    FROM (
        VALUES
            (
                'TER-FUT-001',
                'Terrace Couple',
                'seed.terrace.future.1@demo.com',
                '+32470000101',
                2,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '2 day 18 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '2 day 19 hours 30 minutes',
                'Sunset',
                'CONFIRMED',
                'Seed: terrace sunset booking'
            ),
            (
                'TER-WKD-001',
                'Brunch Group',
                'seed.terrace.future.2@demo.com',
                '+32470000102',
                5,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '6 day 10 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '6 day 11 hours 30 minutes',
                'Brunch',
                'CONFIRMED',
                'Seed: terrace weekend brunch'
            ),
            (
                'TER-PAST-001',
                'Terrace Completed',
                'seed.terrace.past.1@demo.com',
                '+32470000103',
                4,
                date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day' + INTERVAL '18 hours',
                date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day' + INTERVAL '19 hours 30 minutes',
                'Sunset',
                'COMPLETED',
                'Seed: terrace completed reservation'
            )
    ) AS base_rows(code, guest_name, guest_email, guest_phone, party_size, start_at_utc, end_at_utc, shift_name, status, notes)
    UNION ALL
    SELECT
        format('TER-BULK-%s', lpad(ts.n::text, 3, '0')) AS code,
        format('Terrace Bulk Guest %s', ts.n) AS guest_name,
        format('seed.terrace.bulk.%s@demo.com', ts.n) AS guest_email,
        '+3248' || lpad(ts.n::text, 7, '0') AS guest_phone,
        2 + (ts.n % 5) AS party_size,
        ((ts.service_date::timestamp + ts.slot_start_local) AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'UTC' AS start_at_utc,
        (((ts.service_date::timestamp + ts.slot_start_local) AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'UTC') + INTERVAL '90 minutes' AS end_at_utc,
        ts.shift_name,
        CASE
            WHEN ts.n % 11 = 0 THEN 'CANCELLED'
            WHEN ts.n % 9 = 0 THEN 'NO_SHOW'
            WHEN ts.n % 7 = 0 THEN 'COMPLETED'
            WHEN ts.n % 5 = 0 THEN 'SEATED'
            ELSE 'CONFIRMED'
        END AS status,
        format('Seed terrace bulk reservation #%s', ts.n) AS notes
    FROM (
        SELECT
            slot_rows.service_date,
            slot_rows.shift_name,
            slot_rows.slot_start_local,
            row_number() OVER (ORDER BY slot_rows.service_date, slot_rows.shift_name, slot_rows.slot_start_local) AS n
        FROM (
            SELECT
                d.service_date,
                s.shift_name,
                s.slot_start_local
            FROM (
                SELECT gs::date AS service_date
                FROM generate_series(CURRENT_DATE - INTERVAL '14 day', CURRENT_DATE + INTERVAL '18 day', INTERVAL '1 day') gs
                WHERE EXTRACT(ISODOW FROM gs) BETWEEN 2 AND 7
            ) d
            CROSS JOIN (
                VALUES
                    ('Sunset', '17:45'::time),
                    ('Sunset', '19:15'::time),
                    ('Brunch', '10:15'::time)
            ) AS s(shift_name, slot_start_local)
        ) slot_rows
    ) ts
    WHERE ts.n <= 40
)
INSERT INTO reservation (
    restaurant_id,
    shift_id,
    confirmation_code,
    guest_name,
    guest_email,
    guest_phone,
    party_size,
    start_at_utc,
    end_at_utc,
    status,
    cancel_token_hash,
    cancel_token_expires_at_utc,
    notes
)
SELECT
    r.id,
    sh.id,
    tr.code,
    tr.guest_name,
    tr.guest_email,
    tr.guest_phone,
    tr.party_size,
    tr.start_at_utc,
    tr.end_at_utc,
    tr.status,
    lpad(md5('seed:demo-terrace:' || tr.code), 64, '0'),
    (NOW() AT TIME ZONE 'UTC') + INTERVAL '30 days',
    tr.notes
FROM terrace_reservations tr
CROSS JOIN terrace_rest r
LEFT JOIN LATERAL (
    SELECT s.id
    FROM shift s
    WHERE s.restaurant_id = r.id
      AND s.name = tr.shift_name
      AND s.day_of_week = EXTRACT(ISODOW FROM (tr.start_at_utc AT TIME ZONE r.timezone))::int
    ORDER BY s.start_time
    LIMIT 1
) sh ON TRUE;

WITH terrace_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-terrace'
),
terrace_table_map AS (
    SELECT
        code,
        table_label
    FROM (
        VALUES
            ('TER-FUT-001', 'A1'),
            ('TER-WKD-001', 'P1'),
            ('TER-PAST-001', 'B2')
    ) AS t(code, table_label)
    UNION ALL
    SELECT
        format('TER-BULK-%s', lpad(n::text, 3, '0')) AS code,
        CASE (n % 7)
            WHEN 1 THEN 'A1'
            WHEN 2 THEN 'A2'
            WHEN 3 THEN 'B1'
            WHEN 4 THEN 'B2'
            WHEN 5 THEN 'P1'
            WHEN 6 THEN 'P2'
            ELSE 'Lounge1'
        END AS table_label
    FROM generate_series(1, 40) AS n
)
INSERT INTO reservation_table (reservation_id, table_id)
SELECT res.id, dt.id
FROM terrace_table_map ttm
JOIN reservation res ON res.confirmation_code = ttm.code
JOIN terrace_rest tr ON res.restaurant_id = tr.id
JOIN dining_table dt ON dt.restaurant_id = tr.id AND dt.label = ttm.table_label;

-- -----------------------------------------------------------------------------
-- Vacation/closure demo data (future + approval states)
-- -----------------------------------------------------------------------------
DELETE FROM vacation
WHERE notes LIKE 'Seed:%';

WITH demo_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-restaurant'
),
terrace_rest AS (
    SELECT id FROM restaurant WHERE slug = 'demo-terrace'
),
demo_manager_user AS (
    SELECT id FROM user_account WHERE email = 'manager.demo@demo.com'
),
demo_staff_user AS (
    SELECT id FROM user_account WHERE email = 'staff.demo@demo.com'
),
terrace_manager_user AS (
    SELECT id FROM user_account WHERE email = 'manager.terrace@demo.com'
),
terrace_staff_user AS (
    SELECT id FROM user_account WHERE email = 'staff.terrace@demo.com'
)
INSERT INTO vacation (
    restaurant_id,
    user_id,
    type,
    reason,
    start_date,
    end_date,
    notes,
    status,
    approved_by,
    approved_at
)
SELECT
    dr.id,
    NULL::bigint,
    'RESTAURANT_CLOSURE',
    'MAINTENANCE',
    (CURRENT_DATE + 10),
    (CURRENT_DATE + 10),
    'Seed: one-day closure for maintenance',
    'APPROVED',
    NULL::bigint,
    (NOW() AT TIME ZONE 'UTC')
FROM demo_rest dr
UNION ALL
SELECT
    tr.id,
    NULL::bigint,
    'RESTAURANT_CLOSURE',
    'PRIVATE',
    (CURRENT_DATE + 5),
    (CURRENT_DATE + 5),
    'Seed: terrace private event closure',
    'APPROVED',
    NULL::bigint,
    (NOW() AT TIME ZONE 'UTC')
FROM terrace_rest tr
UNION ALL
SELECT
    dr.id,
    su.id,
    'STAFF_VACATION',
    'VACATION',
    (CURRENT_DATE + 7),
    (CURRENT_DATE + 9),
    'Seed: approved staff vacation',
    'APPROVED',
    NULL::bigint,
    (NOW() AT TIME ZONE 'UTC')
FROM demo_rest dr
CROSS JOIN demo_staff_user su
UNION ALL
SELECT
    dr.id,
    su.id,
    'STAFF_VACATION',
    'PERSONAL',
    (CURRENT_DATE + 14),
    (CURRENT_DATE + 15),
    'Seed: pending staff vacation request',
    'PENDING',
    NULL::bigint,
    NULL::timestamp
FROM demo_rest dr
CROSS JOIN demo_staff_user su
UNION ALL
SELECT
    dr.id,
    su.id,
    'STAFF_VACATION',
    'SICK',
    (CURRENT_DATE + 3),
    (CURRENT_DATE + 3),
    'Seed: rejected staff vacation request',
    'REJECTED',
    mu.id,
    (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day'
FROM demo_rest dr
CROSS JOIN demo_staff_user su
CROSS JOIN demo_manager_user mu
UNION ALL
SELECT
    tr.id,
    tsu.id,
    'STAFF_VACATION',
    'PERSONAL',
    (CURRENT_DATE + 8),
    (CURRENT_DATE + 10),
    'Seed: terrace approved staff vacation',
    'APPROVED',
    tmu.id,
    (NOW() AT TIME ZONE 'UTC') - INTERVAL '2 hours'
FROM terrace_rest tr
CROSS JOIN terrace_staff_user tsu
CROSS JOIN terrace_manager_user tmu
UNION ALL
SELECT
    tr.id,
    tsu.id,
    'STAFF_VACATION',
    'VACATION',
    (CURRENT_DATE + 16),
    (CURRENT_DATE + 17),
    'Seed: terrace pending vacation request',
    'PENDING',
    NULL::bigint,
    NULL::timestamp
FROM terrace_rest tr
CROSS JOIN terrace_staff_user tsu;
