-- The user feed reads the last 24 hours of its Organizations' loot records.
-- With no index on "createdAt" it read every record of those Organizations.
--
-- The migrator runs in a transaction, which does not support CONCURRENTLY, and
-- a plain build reads the whole table while blocking loot submissions. Build
-- the index first on a populated database (see drizzle/README.md); the guard
-- below stops the deploy otherwise, and CREATE INDEX IF NOT EXISTS then
-- becomes a no-op. A failed concurrent build leaves an invalid index that
-- IF NOT EXISTS would keep, so that stops the deploy at any table size.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_index WHERE NOT "indisvalid" AND "indexrelid" = to_regclass('"OrganizationLootRecord_createdAt_brin_idx"')
  ) THEN
    RAISE EXCEPTION 'OrganizationLootRecord_createdAt_brin_idx is invalid; drop and rebuild it concurrently, see apps/api/drizzle/README.md';
  END IF;

  IF (SELECT "reltuples" FROM pg_class WHERE "oid" = '"OrganizationLootRecord"'::regclass) > 100000
    AND to_regclass('"OrganizationLootRecord_createdAt_brin_idx"') IS NULL
  THEN
    RAISE EXCEPTION 'Build OrganizationLootRecord_createdAt_brin_idx concurrently first; see apps/api/drizzle/README.md';
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "OrganizationLootRecord_createdAt_brin_idx" ON "OrganizationLootRecord" USING brin ("createdAt") WITH (pages_per_range=16, autosummarize=on);
