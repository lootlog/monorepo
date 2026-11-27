UPDATE "BingoBoard"
SET "world" = NULLIF(lower(btrim("world")), '')
WHERE "world" IS NOT NULL
  AND "world" IS DISTINCT FROM NULLIF(lower(btrim("world")), '');
