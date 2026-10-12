ALTER TABLE restaurant
    ADD COLUMN min_notice_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN max_advance_days INTEGER NOT NULL DEFAULT 90,
    ADD COLUMN max_party_size INTEGER NOT NULL DEFAULT 20;

ALTER TABLE restaurant
    ADD CONSTRAINT restaurant_min_notice_non_negative CHECK (min_notice_minutes >= 0),
    ADD CONSTRAINT restaurant_max_advance_positive CHECK (max_advance_days > 0),
    ADD CONSTRAINT restaurant_max_party_size_positive CHECK (max_party_size > 0);
