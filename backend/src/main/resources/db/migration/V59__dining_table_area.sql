ALTER TABLE dining_table
    ADD COLUMN area VARCHAR(80) NOT NULL DEFAULT 'Main hall',
    ADD COLUMN allow_cross_area_combine BOOLEAN NOT NULL DEFAULT FALSE;
