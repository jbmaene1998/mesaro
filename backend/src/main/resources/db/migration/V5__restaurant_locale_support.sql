ALTER TABLE restaurant
    ADD COLUMN locale VARCHAR(10) NOT NULL DEFAULT 'en';

ALTER TABLE restaurant
    ADD CONSTRAINT restaurant_locale_format CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');
