-- Normalize legacy event world values to trimmed lowercase
UPDATE "Event"
SET "world" = LOWER(BTRIM("world"))
WHERE "world" <> LOWER(BTRIM("world"));
