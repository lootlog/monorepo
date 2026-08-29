-- Add the action-specific capability without removing LOOTLOG_MANAGE while it
-- still protects unrelated legacy features.
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'LOOTLOG_LOOTS_ARCHIVE';

CREATE TABLE "OrganizationLootRecord" (
  "id" SERIAL NOT NULL,
  "lootId" INTEGER NOT NULL,
  "guildId" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "archivedByMemberId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationLootRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationLootRecord_guildId_lootId_key"
ON "OrganizationLootRecord"("guildId", "lootId");
CREATE INDEX "OrganizationLootRecord_lootId_idx"
ON "OrganizationLootRecord"("lootId");
CREATE INDEX "OrganizationLootRecord_guildId_archivedAt_lootId_idx"
ON "OrganizationLootRecord"("guildId", "archivedAt", "lootId");
CREATE INDEX "OrganizationLootRecord_archivedByMemberId_idx"
ON "OrganizationLootRecord"("archivedByMemberId");

ALTER TABLE "OrganizationLootRecord"
ADD CONSTRAINT "OrganizationLootRecord_lootId_fkey"
FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "OrganizationLootRecord_guildId_fkey"
FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "OrganizationLootRecord_archivedByMemberId_fkey"
FOREIGN KEY ("archivedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LootSubmission"
ADD COLUMN "organizationLootRecordId" INTEGER;

ALTER TABLE "LootComment"
ADD COLUMN "organizationLootRecordId" INTEGER;
