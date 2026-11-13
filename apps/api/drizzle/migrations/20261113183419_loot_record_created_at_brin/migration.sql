-- The user feed reads the last 24 hours of its Organizations' loot records.
-- With no index on "createdAt" it read every record of those Organizations.
--
-- The migrator runs in a transaction, which does not support CONCURRENTLY, and
-- a plain build reads the whole table while blocking loot submissions. Build
-- the index first on a populated database (see drizzle/README.md); the guard
-- below stops the deploy otherwise, and CREATE INDEX IF NOT EXISTS then
-- becomes a no-op.
DO $$
BEGIN
  IF (SELECT "reltuples" FROM pg_class WHERE "oid" = '"OrganizationLootRecord"'::regclass) > 100000
    AND NOT EXISTS (
      SELECT 1 FROM pg_index WHERE "indisvalid" AND "indexrelid" = to_regclass('"OrganizationLootRecord_createdAt_brin_idx"')
    )
  THEN
    RAISE EXCEPTION 'Build OrganizationLootRecord_createdAt_brin_idx concurrently first; see apps/api/drizzle/README.md';
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "OrganizationLootRecord_createdAt_brin_idx" ON "OrganizationLootRecord" USING brin ("createdAt") WITH (pages_per_range=16, autosummarize=on);
