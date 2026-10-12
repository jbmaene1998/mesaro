CREATE TABLE staff_weekly_work_hours (
    id               BIGSERIAL PRIMARY KEY,
    restaurant_id    BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
    user_id          BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    week_start_date  DATE NOT NULL,
    planned_hours    NUMERIC(6,2) NOT NULL,
    created_at_utc   TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at_utc   TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT uq_staff_weekly_work_hours UNIQUE (restaurant_id, user_id, week_start_date)
);

CREATE INDEX idx_staff_weekly_work_hours_restaurant_week
    ON staff_weekly_work_hours(restaurant_id, week_start_date);
