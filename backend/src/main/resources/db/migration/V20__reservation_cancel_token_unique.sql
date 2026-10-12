-- Enforce uniqueness of non-null cancel token hashes.
CREATE UNIQUE INDEX uq_reservation_cancel_token
  ON reservation(cancel_token_hash)
  WHERE cancel_token_hash IS NOT NULL;
