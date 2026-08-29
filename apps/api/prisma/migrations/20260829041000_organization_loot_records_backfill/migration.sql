-- Preserve the legacy permission's loot-archive behavior while callers migrate
-- to the action-specific capability. Other LOOTLOG_MANAGE behavior is unchanged.
UPDATE "Role"
SET "permissions" = array_append(
  "permissions",
  'LOOTLOG_LOOTS_ARCHIVE'::"Permission"
)
WHERE 'LOOTLOG_MANAGE'::"Permission" = ANY("permissions")
  AND NOT ('LOOTLOG_LOOTS_ARCHIVE'::"Permission" = ANY("permissions"));

-- A historical Organization Loot record exists when either a submission or a
-- comment proves that the global Loot belonged to that Organization.
INSERT INTO "OrganizationLootRecord" (
  "lootId",
  "guildId",
  "createdAt",
  "updatedAt"
)
SELECT
  source."lootId",
  source."guildId",
  min(source."createdAt") AS "createdAt",
  min(source."createdAt") AS "updatedAt"
FROM (
  SELECT "lootId", "guildId", "createdAt" FROM "LootSubmission"
  UNION ALL
  SELECT "lootId", "guildId", "createdAt" FROM "LootComment"
) AS source
GROUP BY source."lootId", source."guildId"
ON CONFLICT ("guildId", "lootId") DO NOTHING;

UPDATE "LootSubmission" AS submission
SET "organizationLootRecordId" = record."id"
FROM "OrganizationLootRecord" AS record
WHERE submission."organizationLootRecordId" IS NULL
  AND record."lootId" = submission."lootId"
  AND record."guildId" = submission."guildId";

UPDATE "LootComment" AS comment
SET "organizationLootRecordId" = record."id"
FROM "OrganizationLootRecord" AS record
WHERE comment."organizationLootRecordId" IS NULL
  AND record."lootId" = comment."lootId"
  AND record."guildId" = comment."guildId";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "LootSubmission"
    WHERE "organizationLootRecordId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Organization Loot backfill left submissions unresolved';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "LootComment"
    WHERE "organizationLootRecordId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Organization Loot backfill left comments unresolved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "LootSubmission" AS submission
    JOIN "OrganizationLootRecord" AS record
      ON record."id" = submission."organizationLootRecordId"
    WHERE record."lootId" IS DISTINCT FROM submission."lootId"
       OR record."guildId" IS DISTINCT FROM submission."guildId"
  ) THEN
    RAISE EXCEPTION 'Organization Loot backfill mismatched a submission';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "LootComment" AS comment
    JOIN "OrganizationLootRecord" AS record
      ON record."id" = comment."organizationLootRecordId"
    WHERE record."lootId" IS DISTINCT FROM comment."lootId"
       OR record."guildId" IS DISTINCT FROM comment."guildId"
  ) THEN
    RAISE EXCEPTION 'Organization Loot backfill mismatched a comment';
  END IF;
END $$;
