ALTER TABLE staff_weekly_work_hours
  ADD CONSTRAINT swwh_hours_non_negative
  CHECK (planned_hours >= 0);
