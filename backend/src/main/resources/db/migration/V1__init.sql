-- Mesaro Database Schema Initialization
-- Version: 1
-- Description: Consolidated schema and seed data (single migration)

-- =============================================================================
-- Restaurant
-- =============================================================================
CREATE TABLE restaurant (
    id                          BIGSERIAL PRIMARY KEY,
    name                        VARCHAR(100) NOT NULL,
    slug                        VARCHAR(50) NOT NULL UNIQUE,
    timezone                    VARCHAR(50) NOT NULL,
    booking_enabled             BOOLEAN NOT NULL DEFAULT true,
    slot_interval_minutes       INTEGER NOT NULL DEFAULT 15,
    default_duration_minutes    INTEGER NOT NULL DEFAULT 90,
    assignment_mode             VARCHAR(10) NOT NULL DEFAULT 'AUTO',
    created_at                  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at                  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT restaurant_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT restaurant_slot_interval_positive CHECK (slot_interval_minutes > 0),
    CONSTRAINT restaurant_duration_positive CHECK (default_duration_minutes > 0),
    CONSTRAINT restaurant_assignment_mode_valid CHECK (assignment_mode IN ('AUTO', 'MANUAL'))
);

CREATE INDEX idx_restaurant_slug ON restaurant(slug);
CREATE INDEX idx_restaurant_booking_enabled ON restaurant(booking_enabled) WHERE booking_enabled = true;

COMMENT ON TABLE restaurant IS 'Core restaurant entity with booking configuration';
COMMENT ON COLUMN restaurant.slug IS 'URL-friendly identifier, immutable after creation';
COMMENT ON COLUMN restaurant.timezone IS 'IANA timezone identifier (e.g., Europe/Brussels)';
COMMENT ON COLUMN restaurant.assignment_mode IS 'AUTO: system assigns tables, MANUAL: staff assigns';

-- =============================================================================
-- Dining Tables
-- =============================================================================
CREATE TABLE dining_table (
    id              BIGSERIAL PRIMARY KEY,
    restaurant_id   BIGINT NOT NULL REFERENCES restaurant(id),
    label           VARCHAR(50) NOT NULL,
    seats           INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    created_at      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT dining_table_seats_positive CHECK (seats > 0),
    CONSTRAINT dining_table_status_valid CHECK (status IN ('AVAILABLE', 'UNAVAILABLE')),
    CONSTRAINT dining_table_label_unique UNIQUE (restaurant_id, label)
);

CREATE INDEX idx_dining_table_restaurant ON dining_table(restaurant_id);
CREATE INDEX idx_dining_table_restaurant_status ON dining_table(restaurant_id, status);

COMMENT ON TABLE dining_table IS 'Physical tables available for seating guests';
COMMENT ON COLUMN dining_table.label IS 'Display name (e.g., T1, Window Table, Patio 3)';
COMMENT ON COLUMN dining_table.seats IS 'Maximum seating capacity';
COMMENT ON COLUMN dining_table.status IS 'AVAILABLE for booking, UNAVAILABLE when out of service';

-- =============================================================================
-- Table Combinations
-- =============================================================================
CREATE TABLE table_combination (
    id              BIGSERIAL PRIMARY KEY,
    restaurant_id   BIGINT NOT NULL REFERENCES restaurant(id),
    name            VARCHAR(100) NOT NULL,
    min_capacity    INTEGER NOT NULL,
    max_capacity    INTEGER NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT table_combination_capacity_valid CHECK (min_capacity > 0 AND max_capacity >= min_capacity),
    CONSTRAINT table_combination_name_unique UNIQUE (restaurant_id, name)
);

CREATE INDEX idx_table_combination_restaurant ON table_combination(restaurant_id);
CREATE INDEX idx_table_combination_capacity ON table_combination(restaurant_id, min_capacity, max_capacity);

CREATE TABLE table_combination_member (
    combination_id  BIGINT NOT NULL REFERENCES table_combination(id) ON DELETE CASCADE,
    table_id        BIGINT NOT NULL REFERENCES dining_table(id) ON DELETE CASCADE,
    PRIMARY KEY (combination_id, table_id)
);

CREATE INDEX idx_table_combination_member_table ON table_combination_member(table_id);

COMMENT ON TABLE table_combination IS 'Named groupings of tables that can be combined for larger parties';
COMMENT ON COLUMN table_combination.min_capacity IS 'Minimum party size suitable for this combination';
COMMENT ON COLUMN table_combination.max_capacity IS 'Maximum party size (sum of table seats or custom value)';
COMMENT ON TABLE table_combination_member IS 'Maps tables to their combinations';
COMMENT ON INDEX idx_table_combination_capacity IS 'Find combinations by capacity range';

-- =============================================================================
-- Shifts
-- =============================================================================
CREATE TABLE shift (
    id                      BIGSERIAL PRIMARY KEY,
    restaurant_id           BIGINT NOT NULL REFERENCES restaurant(id),
    name                    VARCHAR(50) NOT NULL,
    day_of_week             INTEGER NOT NULL,
    start_time              TIME NOT NULL,
    end_time                TIME NOT NULL,
    last_reservation_time   TIME NOT NULL,
    max_covers              INTEGER NOT NULL,
    slot_duration_minutes   INTEGER NOT NULL DEFAULT 15,
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at              TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at              TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT shift_day_of_week_valid CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT shift_times_valid CHECK (start_time <> end_time),
    CONSTRAINT shift_max_covers_positive CHECK (max_covers > 0),
    CONSTRAINT shift_slot_duration_positive CHECK (slot_duration_minutes > 0),
    CONSTRAINT shift_status_valid CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_shift_restaurant ON shift(restaurant_id);
CREATE INDEX idx_shift_restaurant_day ON shift(restaurant_id, day_of_week);
CREATE INDEX idx_shift_restaurant_day_status ON shift(restaurant_id, day_of_week, status);

COMMENT ON TABLE shift IS 'Service periods (e.g., Lunch, Dinner) with capacity limits';
COMMENT ON COLUMN shift.day_of_week IS 'ISO day of week: 1=Monday, 7=Sunday';
COMMENT ON COLUMN shift.start_time IS 'Local time when shift starts';
COMMENT ON COLUMN shift.end_time IS 'Local time when shift ends';
COMMENT ON COLUMN shift.last_reservation_time IS 'Latest local time a reservation can start for this shift';
COMMENT ON COLUMN shift.max_covers IS 'Maximum number of guests during this shift';
COMMENT ON COLUMN shift.slot_duration_minutes IS 'Booking slot interval for this shift';
COMMENT ON COLUMN shift.status IS 'DRAFT: editable, ACTIVE: in use, INACTIVE: disabled';

-- =============================================================================
-- Vacations and Closures
-- =============================================================================
CREATE TABLE vacation (
    id              BIGSERIAL PRIMARY KEY,
    restaurant_id   BIGINT NOT NULL REFERENCES restaurant(id),
    user_id         BIGINT,
    type            VARCHAR(30) NOT NULL,
    reason          VARCHAR(50),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    notes           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by     BIGINT,
    approved_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT vacation_dates_valid CHECK (start_date <= end_date),
    CONSTRAINT vacation_type_valid CHECK (type IN ('RESTAURANT_CLOSURE', 'STAFF_VACATION')),
    CONSTRAINT vacation_reason_valid CHECK (
        (type = 'RESTAURANT_CLOSURE' AND reason IN ('HOLIDAY', 'MAINTENANCE', 'PRIVATE', 'OTHER')) OR
        (type = 'STAFF_VACATION' AND reason IN ('VACATION', 'SICK', 'PERSONAL', 'OTHER'))
    ),
    CONSTRAINT vacation_status_valid CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT vacation_staff_requires_user CHECK (
        (type = 'STAFF_VACATION' AND user_id IS NOT NULL) OR
        (type = 'RESTAURANT_CLOSURE' AND user_id IS NULL)
    )
);

CREATE INDEX idx_vacation_restaurant ON vacation(restaurant_id);
CREATE INDEX idx_vacation_restaurant_dates ON vacation(restaurant_id, start_date, end_date);
CREATE INDEX idx_vacation_restaurant_type ON vacation(restaurant_id, type);
CREATE INDEX idx_vacation_user ON vacation(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_vacation_closure_lookup ON vacation(restaurant_id, type, status, start_date, end_date)
    WHERE type = 'RESTAURANT_CLOSURE' AND status = 'APPROVED';

COMMENT ON TABLE vacation IS 'Restaurant closures and staff vacation requests';
COMMENT ON COLUMN vacation.type IS 'RESTAURANT_CLOSURE: blocks all bookings, STAFF_VACATION: staff time off';
COMMENT ON COLUMN vacation.reason IS 'Closure: HOLIDAY/MAINTENANCE/PRIVATE/OTHER, Vacation: VACATION/SICK/PERSONAL/OTHER';
COMMENT ON COLUMN vacation.status IS 'PENDING: awaiting approval, APPROVED: confirmed, REJECTED: denied, CANCELLED: withdrawn';

-- =============================================================================
-- Holds
-- =============================================================================
CREATE TABLE hold (
    id              BIGSERIAL PRIMARY KEY,
    restaurant_id   BIGINT NOT NULL REFERENCES restaurant(id),
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    party_size      INTEGER NOT NULL,
    start_at_utc    TIMESTAMP NOT NULL,
    end_at_utc      TIMESTAMP NOT NULL,
    shift_id        BIGINT REFERENCES shift(id),
    expires_at_utc  TIMESTAMP NOT NULL,
    confirmed       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT hold_party_size_positive CHECK (party_size > 0),
    CONSTRAINT hold_times_valid CHECK (start_at_utc < end_at_utc)
);

CREATE TABLE hold_table (
    hold_id     BIGINT NOT NULL REFERENCES hold(id) ON DELETE CASCADE,
    table_id    BIGINT NOT NULL REFERENCES dining_table(id),
    PRIMARY KEY (hold_id, table_id)
);

CREATE INDEX idx_hold_restaurant ON hold(restaurant_id);
CREATE INDEX idx_hold_token ON hold(token_hash);
CREATE INDEX idx_hold_expires ON hold(expires_at_utc) WHERE confirmed = false;
CREATE INDEX idx_hold_active ON hold(restaurant_id, confirmed, expires_at_utc);
CREATE INDEX idx_hold_table_table ON hold_table(table_id);

CREATE INDEX idx_hold_overlap ON hold(restaurant_id, start_at_utc, end_at_utc)
    WHERE confirmed = false;

COMMENT ON TABLE hold IS 'Temporary table reservations during booking flow';
COMMENT ON COLUMN hold.token_hash IS 'SHA-256 hash of the hold token (token never stored raw)';
COMMENT ON COLUMN hold.expires_at_utc IS 'Hold expires after 3 minutes if not confirmed';
COMMENT ON COLUMN hold.confirmed IS 'True when converted to a reservation';

-- =============================================================================
-- Reservations
-- =============================================================================
CREATE TABLE reservation (
    id                          BIGSERIAL PRIMARY KEY,
    restaurant_id               BIGINT NOT NULL REFERENCES restaurant(id),
    shift_id                    BIGINT REFERENCES shift(id),
    confirmation_code           VARCHAR(20) NOT NULL UNIQUE,
    guest_name                  VARCHAR(100) NOT NULL,
    guest_email                 VARCHAR(255) NOT NULL,
    guest_phone                 VARCHAR(30),
    party_size                  INTEGER NOT NULL,
    start_at_utc                TIMESTAMP NOT NULL,
    end_at_utc                  TIMESTAMP NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    cancel_token_hash           VARCHAR(64),
    cancel_token_expires_at_utc TIMESTAMP,
    notes                       TEXT,
    created_at                  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at                  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT reservation_party_size_positive CHECK (party_size > 0),
    CONSTRAINT reservation_times_valid CHECK (start_at_utc < end_at_utc),
    CONSTRAINT reservation_status_valid CHECK (status IN ('CONFIRMED', 'SEATED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'))
);

CREATE TABLE reservation_table (
    reservation_id  BIGINT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    table_id        BIGINT NOT NULL REFERENCES dining_table(id),
    PRIMARY KEY (reservation_id, table_id)
);

CREATE INDEX idx_reservation_restaurant ON reservation(restaurant_id);
CREATE INDEX idx_reservation_code ON reservation(confirmation_code);
CREATE INDEX idx_reservation_lookup ON reservation(restaurant_id, status, start_at_utc);
CREATE INDEX idx_reservation_guest_email ON reservation(guest_email);
CREATE INDEX idx_reservation_shift ON reservation(shift_id);
CREATE INDEX idx_reservation_table_table ON reservation_table(table_id);

CREATE INDEX idx_reservation_overlap ON reservation(restaurant_id, start_at_utc, end_at_utc)
    WHERE status IN ('CONFIRMED', 'SEATED');

COMMENT ON TABLE reservation IS 'Confirmed guest reservations';
COMMENT ON COLUMN reservation.confirmation_code IS 'Human-readable code (e.g., RES-2026-001234)';
COMMENT ON COLUMN reservation.cancel_token_hash IS 'SHA-256 hash of guest cancellation token';
COMMENT ON COLUMN reservation.status IS 'CONFIRMED→SEATED→COMPLETED or CONFIRMED→NO_SHOW or CONFIRMED→CANCELLED';

-- =============================================================================
-- Opening Hours
-- =============================================================================
CREATE TABLE opening_hours (
    restaurant_id      BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
    day_of_week        INTEGER NOT NULL,
    open_local_time    TIME,
    close_local_time   TIME,

    PRIMARY KEY (restaurant_id, day_of_week),
    CONSTRAINT opening_hours_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT opening_hours_time_valid CHECK (
        (open_local_time IS NULL AND close_local_time IS NULL)
        OR (open_local_time IS NOT NULL AND close_local_time IS NOT NULL AND open_local_time < close_local_time)
    )
);

CREATE INDEX idx_opening_hours_restaurant_id ON opening_hours(restaurant_id);
CREATE INDEX idx_opening_hours_day_of_week ON opening_hours(day_of_week);

INSERT INTO opening_hours (restaurant_id, day_of_week, open_local_time, close_local_time)
SELECT r.id, d, NULL, NULL
FROM restaurant r
CROSS JOIN generate_series(1, 7) AS d;

-- =============================================================================
-- User Accounts and Roles
-- =============================================================================
CREATE TABLE user_account (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    created_at_utc  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE TABLE user_restaurant (
    user_id         BIGINT NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    restaurant_id   BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE RESTRICT,
    role            VARCHAR(20) NOT NULL,

    PRIMARY KEY (user_id, restaurant_id),
    CONSTRAINT user_restaurant_role_valid CHECK (role IN ('OWNER', 'MANAGER', 'STAFF'))
);

CREATE INDEX idx_user_account_email ON user_account(email);
CREATE INDEX idx_user_restaurant_user_id ON user_restaurant(user_id);
CREATE INDEX idx_user_restaurant_restaurant_role ON user_restaurant(restaurant_id, role);

-- =============================================================================
-- Refresh Tokens
-- =============================================================================
CREATE TABLE refresh_token (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    token           VARCHAR(255) NOT NULL UNIQUE,
    expires_at_utc  TIMESTAMP NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT false,
    created_at_utc  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_refresh_token_token ON refresh_token(token);
CREATE INDEX idx_refresh_token_user_id ON refresh_token(user_id);

-- =============================================================================
-- Staff Invites
-- =============================================================================
CREATE TABLE staff_invite (
    id                  BIGSERIAL PRIMARY KEY,
    restaurant_id       BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE RESTRICT,
    email               VARCHAR(255) NOT NULL,
    role                VARCHAR(20) NOT NULL,
    token_hash          VARCHAR(64) NOT NULL UNIQUE,
    expires_at_utc      TIMESTAMP NOT NULL,
    accepted_at_utc     TIMESTAMP,
    revoked_at_utc      TIMESTAMP,
    invited_by_user_id  BIGINT REFERENCES user_account(id) ON DELETE SET NULL,
    created_at_utc      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT staff_invite_role_valid CHECK (role IN ('MANAGER', 'STAFF'))
);

CREATE INDEX idx_staff_invite_restaurant ON staff_invite(restaurant_id);
CREATE INDEX idx_staff_invite_email ON staff_invite(email);
CREATE INDEX idx_staff_invite_active ON staff_invite(restaurant_id, email, expires_at_utc);

CREATE UNIQUE INDEX uq_staff_invite_active_email
    ON staff_invite(restaurant_id, email)
    WHERE accepted_at_utc IS NULL AND revoked_at_utc IS NULL;

-- =============================================================================
-- Audit Events
-- =============================================================================
CREATE TABLE audit_event (
    id              BIGSERIAL PRIMARY KEY,
    restaurant_id   BIGINT REFERENCES restaurant(id) ON DELETE SET NULL,
    actor_user_id   BIGINT REFERENCES user_account(id) ON DELETE SET NULL,
    event_type      VARCHAR(100) NOT NULL,
    payload_json    TEXT NOT NULL,
    created_at_utc  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_audit_event_restaurant_created
    ON audit_event(restaurant_id, created_at_utc DESC);

-- =============================================================================
-- Email Send Log
-- =============================================================================
CREATE TABLE email_send_log (
    id                  BIGSERIAL PRIMARY KEY,
    restaurant_id       BIGINT REFERENCES restaurant(id) ON DELETE SET NULL,
    recipient_email     VARCHAR(255) NOT NULL,
    email_type          VARCHAR(50) NOT NULL,
    subject             VARCHAR(500) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message       TEXT,
    reference_type      VARCHAR(50),
    reference_id        BIGINT,
    sent_at_utc         TIMESTAMP,
    created_at_utc      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT email_send_log_type_valid CHECK (
        email_type IN (
            'RESERVATION_CONFIRMATION',
            'RESERVATION_CANCELLED',
            'RESERVATION_REMINDER',
            'STAFF_INVITE',
            'PASSWORD_RESET',
            'ACCOUNT_WELCOME'
        )
    ),
    CONSTRAINT email_send_log_status_valid CHECK (
        status IN ('PENDING', 'SENT', 'FAILED', 'BOUNCED')
    )
);

CREATE INDEX idx_email_send_log_restaurant ON email_send_log(restaurant_id);
CREATE INDEX idx_email_send_log_recipient ON email_send_log(recipient_email);
CREATE INDEX idx_email_send_log_type ON email_send_log(email_type);
CREATE INDEX idx_email_send_log_status ON email_send_log(status) WHERE status != 'SENT';
CREATE INDEX idx_email_send_log_created ON email_send_log(created_at_utc DESC);
CREATE INDEX idx_email_send_log_reference ON email_send_log(reference_type, reference_id)
    WHERE reference_type IS NOT NULL;

COMMENT ON TABLE email_send_log IS 'Audit log of all outbound emails';
COMMENT ON COLUMN email_send_log.email_type IS 'Type of email sent';
COMMENT ON COLUMN email_send_log.status IS 'PENDING: queued, SENT: delivered to SMTP, FAILED: error, BOUNCED: rejected';
COMMENT ON COLUMN email_send_log.reference_type IS 'Entity type (e.g., RESERVATION, STAFF_INVITE)';
COMMENT ON COLUMN email_send_log.reference_id IS 'ID of related entity';

-- =============================================================================
-- Password Reset
-- =============================================================================
CREATE TABLE password_reset (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    expires_at_utc  TIMESTAMP NOT NULL,
    used_at_utc     TIMESTAMP,
    created_at_utc  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_password_reset_token ON password_reset(token_hash);
CREATE INDEX idx_password_reset_user_active ON password_reset(user_id, expires_at_utc)
    WHERE used_at_utc IS NULL;
-- NOTE: Postgres requires IMMUTABLE functions in index predicates; NOW() is STABLE.
-- We keep the uniqueness enforcement for unused tokens and rely on cleanup to remove expired rows.
CREATE UNIQUE INDEX uq_password_reset_active_user ON password_reset(user_id)
    WHERE used_at_utc IS NULL;

COMMENT ON TABLE password_reset IS 'Password reset tokens with single-use and expiration';
COMMENT ON COLUMN password_reset.token_hash IS 'SHA-256 hash of reset token';
COMMENT ON COLUMN password_reset.used_at_utc IS 'When token was used (NULL if unused)';

COMMENT ON TABLE restaurant IS 'Core restaurant entity with booking configuration.';

-- =============================================================================
-- Performance Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_reservation_timeline
    ON reservation(restaurant_id, start_at_utc, end_at_utc)
    WHERE status IN ('CONFIRMED', 'SEATED');

CREATE INDEX IF NOT EXISTS idx_reservation_cancel_token
    ON reservation(cancel_token_hash)
    WHERE cancel_token_hash IS NOT NULL AND status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_reservation_stats
    ON reservation(restaurant_id, status, DATE_TRUNC('month', start_at_utc));

CREATE INDEX IF NOT EXISTS idx_shift_active_day
    ON shift(restaurant_id, day_of_week)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_user_account_login
    ON user_account(email)
    WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_restaurant_lookup
    ON user_restaurant(user_id, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_audit_event_type_recent
    ON audit_event(event_type, created_at_utc DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_reservation
    ON audit_event(restaurant_id, (payload_json::jsonb->>'reservationId'))
    WHERE payload_json::jsonb ? 'reservationId';

CREATE INDEX IF NOT EXISTS idx_vacation_active_closure
    ON vacation(restaurant_id, start_date, end_date)
    WHERE type = 'RESTAURANT_CLOSURE' AND status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_refresh_token_expired
    ON refresh_token(expires_at_utc)
    WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_staff_invite_pending
    ON staff_invite(expires_at_utc)
    WHERE accepted_at_utc IS NULL AND revoked_at_utc IS NULL;

ANALYZE restaurant;
ANALYZE dining_table;
ANALYZE table_combination;
ANALYZE shift;
ANALYZE vacation;
ANALYZE hold;
ANALYZE reservation;
ANALYZE reservation_table;
ANALYZE user_account;
ANALYZE user_restaurant;
ANALYZE refresh_token;
ANALYZE staff_invite;
ANALYZE audit_event;
ANALYZE opening_hours;

COMMENT ON INDEX idx_reservation_timeline IS 'Optimizes dashboard timeline queries';
COMMENT ON INDEX idx_reservation_cancel_token IS 'Optimizes guest self-cancel lookup';
COMMENT ON INDEX idx_hold_active IS 'Optimizes availability checks';
