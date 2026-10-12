-- Prevent two ACTIVE shifts on the same restaurant/day with the same start time.
-- This does not catch all overlapping time windows (e.g. different start, overlapping range).
-- A BEFORE INSERT/UPDATE trigger is required for complete protection.
CREATE UNIQUE INDEX uq_shift_restaurant_day_start
  ON shift(restaurant_id, day_of_week, start_time)
  WHERE status = 'ACTIVE';
