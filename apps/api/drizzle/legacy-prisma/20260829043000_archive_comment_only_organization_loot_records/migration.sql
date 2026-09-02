-- The legacy delete flow removed an Organization's submissions while retaining
-- its comments. Preserve those historical pairs without making them visible
-- again after the Organization Loot backfill.
UPDATE "OrganizationLootRecord" AS record
SET
  "archivedAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE record."archivedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "LootComment" AS comment
    WHERE comment."organizationLootRecordId" = record."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "LootSubmission" AS submission
    WHERE submission."organizationLootRecordId" = record."id"
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "OrganizationLootRecord" AS record
    WHERE record."archivedAt" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "LootComment" AS comment
        WHERE comment."organizationLootRecordId" = record."id"
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "LootSubmission" AS submission
        WHERE submission."organizationLootRecordId" = record."id"
      )
  ) THEN
    RAISE EXCEPTION 'Organization Loot migration left a comment-only record active';
  END IF;
END $$;
