-- Block any UPDATE that changes restaurant.slug after creation.

CREATE OR REPLACE FUNCTION prevent_restaurant_slug_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug <> OLD.slug THEN
    RAISE EXCEPTION
      'restaurant.slug is immutable after creation (restaurant id=%)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restaurant_slug_immutable
BEFORE UPDATE OF slug ON restaurant
FOR EACH ROW EXECUTE FUNCTION prevent_restaurant_slug_change();
