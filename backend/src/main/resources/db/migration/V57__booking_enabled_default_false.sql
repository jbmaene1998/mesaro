-- New restaurants start with bookings disabled until tables and active shifts exist.
ALTER TABLE restaurant
    ALTER COLUMN booking_enabled SET DEFAULT false;
