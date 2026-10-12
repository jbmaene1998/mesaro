CREATE TABLE staff_shift_assignment (
    id              BIGSERIAL PRIMARY KEY,
    restaurant_id   BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
    shift_id        BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    service_date    DATE NOT NULL,
    created_at_utc  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT uq_staff_shift_assignment UNIQUE (shift_id, user_id, service_date)
);

CREATE INDEX idx_staff_shift_assignment_restaurant_date
    ON staff_shift_assignment(restaurant_id, service_date);

CREATE INDEX idx_staff_shift_assignment_shift_date
    ON staff_shift_assignment(shift_id, service_date);

CREATE INDEX idx_staff_shift_assignment_user_date
    ON staff_shift_assignment(user_id, service_date);
