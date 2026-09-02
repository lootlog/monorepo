-- CreateEnum
CREATE TYPE "GuildDocumentHistoryAction" AS ENUM ('SAVE', 'DELETE', 'RESTORE');

-- AlterTable
ALTER TABLE "GuildDocument"
ADD COLUMN "createdByMemberId" TEXT,
ADD COLUMN "updatedByMemberId" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByMemberId" TEXT;

-- AlterTable
ALTER TABLE "GuildDocumentHistory"
ADD COLUMN "action" "GuildDocumentHistoryAction" NOT NULL DEFAULT 'SAVE',
ADD COLUMN "actorMemberId" TEXT;

-- Backfill document creator/updater Discord IDs from existing auth/global user IDs.
UPDATE "GuildDocument" document
SET "createdByMemberId" = COALESCE(
  (
    SELECT member."userId"
    FROM "Member" member
    WHERE member."guildId" = document."guildId"
      AND member."globalUserId" = document."createdByUserId"
    ORDER BY member."active" DESC, member."updatedAt" DESC
    LIMIT 1
  ),
  (
    SELECT member."userId"
    FROM "Member" member
    WHERE member."guildId" = document."guildId"
      AND member."userId" = document."createdByUserId"
    ORDER BY member."active" DESC, member."updatedAt" DESC
    LIMIT 1
  ),
  document."createdByUserId"
),
"updatedByMemberId" = COALESCE(
  (
    SELECT member."userId"
    FROM "Member" member
    WHERE member."guildId" = document."guildId"
      AND member."globalUserId" = document."updatedByUserId"
    ORDER BY member."active" DESC, member."updatedAt" DESC
    LIMIT 1
  ),
  (
    SELECT member."userId"
    FROM "Member" member
    WHERE member."guildId" = document."guildId"
      AND member."userId" = document."updatedByUserId"
    ORDER BY member."active" DESC, member."updatedAt" DESC
    LIMIT 1
  ),
  document."updatedByUserId"
);

-- Backfill history actor Discord IDs from existing auth/global user IDs.
UPDATE "GuildDocumentHistory" history
SET "actorMemberId" = COALESCE(
  (
    SELECT member."userId"
    FROM "Member" member
    WHERE member."guildId" = history."guildId"
      AND member."globalUserId" = history."editedByUserId"
    ORDER BY member."active" DESC, member."updatedAt" DESC
    LIMIT 1
  ),
  (
    SELECT member."userId"
    FROM "Member" member
    WHERE member."guildId" = history."guildId"
      AND member."userId" = history."editedByUserId"
    ORDER BY member."active" DESC, member."updatedAt" DESC
    LIMIT 1
  ),
  history."editedByUserId"
);

-- AlterTable
ALTER TABLE "GuildDocument"
ALTER COLUMN "createdByMemberId" SET NOT NULL,
ALTER COLUMN "updatedByMemberId" SET NOT NULL,
DROP COLUMN "createdByUserId",
DROP COLUMN "updatedByUserId";

-- AlterTable
ALTER TABLE "GuildDocumentHistory"
ALTER COLUMN "actorMemberId" SET NOT NULL,
DROP COLUMN "editedByUserId";

-- DropIndex
DROP INDEX "GuildDocument_guildId_updatedAt_idx";

-- DropIndex
DROP INDEX "GuildDocumentHistory_documentId_version_key";

-- CreateIndex
CREATE INDEX "GuildDocument_guildId_deletedAt_updatedAt_idx" ON "GuildDocument"("guildId", "deletedAt", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "GuildDocument_guildId_deletedAt_idx" ON "GuildDocument"("guildId", "deletedAt" DESC);

-- CreateIndex
CREATE INDEX "GuildDocumentHistory_documentId_version_idx" ON "GuildDocumentHistory"("documentId", "version");
