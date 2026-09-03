ALTER TABLE "LootSubmission"
ADD CONSTRAINT "LootSubmission_organizationLootRecordId_not_null"
CHECK ("organizationLootRecordId" IS NOT NULL) NOT VALID;
ALTER TABLE "LootSubmission"
VALIDATE CONSTRAINT "LootSubmission_organizationLootRecordId_not_null";

ALTER TABLE "LootComment"
ADD CONSTRAINT "LootComment_organizationLootRecordId_not_null"
CHECK ("organizationLootRecordId" IS NOT NULL) NOT VALID;
ALTER TABLE "LootComment"
VALIDATE CONSTRAINT "LootComment_organizationLootRecordId_not_null";

ALTER TABLE "LootSubmission"
ALTER COLUMN "organizationLootRecordId" SET NOT NULL;
ALTER TABLE "LootComment"
ALTER COLUMN "organizationLootRecordId" SET NOT NULL;

CREATE UNIQUE INDEX "LootSubmission_organizationLootRecordId_memberId_key"
ON "LootSubmission"("organizationLootRecordId", "memberId");
CREATE INDEX "LootSubmission_memberId_idx"
ON "LootSubmission"("memberId");
CREATE INDEX "LootComment_organizationLootRecordId_createdAt_idx"
ON "LootComment"("organizationLootRecordId", "createdAt");
CREATE INDEX "LootComment_memberId_idx"
ON "LootComment"("memberId");

ALTER TABLE "LootSubmission"
ADD CONSTRAINT "LootSubmission_organizationLootRecordId_fkey"
FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LootComment"
ADD CONSTRAINT "LootComment_organizationLootRecordId_fkey"
FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "LootSubmission_lootId_guildId_memberId_key";
DROP INDEX "LootSubmission_guildId_lootId_idx";
DROP INDEX "LootComment_lootId_idx";
DROP INDEX "LootComment_lootId_guildId_idx";

ALTER TABLE "LootSubmission"
DROP CONSTRAINT "LootSubmission_lootId_fkey",
DROP CONSTRAINT "LootSubmission_guildId_fkey",
DROP COLUMN "lootId",
DROP COLUMN "guildId",
DROP CONSTRAINT "LootSubmission_organizationLootRecordId_not_null";

ALTER TABLE "LootComment"
DROP CONSTRAINT "LootComment_lootId_fkey",
DROP COLUMN "lootId",
DROP COLUMN "guildId",
DROP CONSTRAINT "LootComment_organizationLootRecordId_not_null";
