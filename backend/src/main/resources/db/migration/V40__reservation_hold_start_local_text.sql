ALTER TABLE reservation
    ADD COLUMN IF NOT EXISTS start_local_text VARCHAR(16);

ALTER TABLE hold
    ADD COLUMN IF NOT EXISTS start_local_text VARCHAR(16);
