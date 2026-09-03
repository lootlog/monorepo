-- Kill Tracking Deduplication Migration
-- This migration consolidates kill stats per (guildId, memberId, world, npcId) instead of per character

-- Step 1: Create GuildKillSummary table for deduplicated guild kills
CREATE TABLE "GuildKillSummary" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "uniqueKills" INTEGER NOT NULL DEFAULT 0,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildKillSummary_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add memberKills column to NpcKillStats
ALTER TABLE "NpcKillStats" ADD COLUMN "memberKills" INTEGER NOT NULL DEFAULT 0;

-- Step 3: Copy totalKills to memberKills
UPDATE "NpcKillStats" SET "memberKills" = "totalKills";

-- Step 4: Migrate data to GuildKillSummary (aggregate per guild/world/npc)
INSERT INTO "GuildKillSummary" ("id", "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "uniqueKills", "lastKilledAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "guildId",
    "world",
    "npcId",
    (array_agg("npcName" ORDER BY "npcLvl" DESC))[1],
    (array_agg("npcType"))[1],
    MAX("npcLvl"),
    (array_agg("npcProf" ORDER BY "npcLvl" DESC))[1],
    (array_agg("npcIcon" ORDER BY "npcLvl" DESC))[1],
    SUM("totalKills"),
    MAX("lastKilledAt"),
    NOW()
FROM "NpcKillStats"
GROUP BY "guildId", "world", "npcId";

-- Step 5: Create temp table with consolidated NpcKillStats (per guildId/memberId/world/npcId)
CREATE TEMP TABLE "NpcKillStats_temp" AS
SELECT
    (array_agg("id" ORDER BY "lastKilledAt" DESC))[1] as "id",
    "guildId",
    "memberId",
    "userId",
    "world",
    "npcId",
    (array_agg("npcName" ORDER BY "npcLvl" DESC))[1] as "npcName",
    (array_agg("npcType"))[1] as "npcType",
    MAX("npcLvl") as "npcLvl",
    (array_agg("npcProf" ORDER BY "npcLvl" DESC))[1] as "npcProf",
    (array_agg("npcIcon" ORDER BY "npcLvl" DESC))[1] as "npcIcon",
    SUM("memberKills")::integer as "memberKills",
    MAX("lastKilledAt") as "lastKilledAt",
    MAX("updatedAt") as "updatedAt"
FROM "NpcKillStats"
GROUP BY "guildId", "memberId", "userId", "world", "npcId";

-- Step 6: Drop old indexes and constraints on NpcKillStats
DROP INDEX IF EXISTS "NpcKillStats_guildId_memberId_characterId_world_npcId_key";
DROP INDEX IF EXISTS "NpcKillStats_guildId_memberId_idx";
DROP INDEX IF EXISTS "NpcKillStats_memberId_npcId_idx";
DROP INDEX IF EXISTS "NpcKillStats_userId_characterId_idx";
DROP INDEX IF EXISTS "NpcKillStats_userId_idx";

-- Step 7: Drop old columns from NpcKillStats
ALTER TABLE "NpcKillStats" DROP COLUMN "accountId";
ALTER TABLE "NpcKillStats" DROP COLUMN "characterIcon";
ALTER TABLE "NpcKillStats" DROP COLUMN "characterId";
ALTER TABLE "NpcKillStats" DROP COLUMN "characterLvl";
ALTER TABLE "NpcKillStats" DROP COLUMN "characterName";
ALTER TABLE "NpcKillStats" DROP COLUMN "characterProf";
ALTER TABLE "NpcKillStats" DROP COLUMN "totalKills";

-- Step 8: Clear and repopulate NpcKillStats with consolidated data
DELETE FROM "NpcKillStats";

INSERT INTO "NpcKillStats" ("id", "guildId", "memberId", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "memberKills", "lastKilledAt", "updatedAt")
SELECT "id", "guildId", "memberId", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "memberKills", "lastKilledAt", "updatedAt"
FROM "NpcKillStats_temp";

DROP TABLE "NpcKillStats_temp";

-- Step 9: Create temp table with consolidated UserKillStats (per userId/world/npcId)
CREATE TEMP TABLE "UserKillStats_temp" AS
SELECT
    (array_agg("id" ORDER BY "lastKilledAt" DESC))[1] as "id",
    "userId",
    "world",
    "npcId",
    (array_agg("npcName" ORDER BY "npcLvl" DESC))[1] as "npcName",
    (array_agg("npcType"))[1] as "npcType",
    MAX("npcLvl") as "npcLvl",
    (array_agg("npcProf" ORDER BY "npcLvl" DESC))[1] as "npcProf",
    (array_agg("npcIcon" ORDER BY "npcLvl" DESC))[1] as "npcIcon",
    SUM("totalKills")::integer as "totalKills",
    MAX("lastKilledAt") as "lastKilledAt",
    MAX("updatedAt") as "updatedAt"
FROM "UserKillStats"
GROUP BY "userId", "world", "npcId";

-- Step 10: Drop old indexes and constraints on UserKillStats
DROP INDEX IF EXISTS "UserKillStats_userId_characterId_idx";
DROP INDEX IF EXISTS "UserKillStats_userId_characterId_world_npcId_key";

-- Step 11: Drop old columns from UserKillStats
ALTER TABLE "UserKillStats" DROP COLUMN "accountId";
ALTER TABLE "UserKillStats" DROP COLUMN "characterIcon";
ALTER TABLE "UserKillStats" DROP COLUMN "characterId";
ALTER TABLE "UserKillStats" DROP COLUMN "characterLvl";
ALTER TABLE "UserKillStats" DROP COLUMN "characterName";
ALTER TABLE "UserKillStats" DROP COLUMN "characterProf";

-- Step 12: Clear and repopulate UserKillStats with consolidated data
DELETE FROM "UserKillStats";

INSERT INTO "UserKillStats" ("id", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "totalKills", "lastKilledAt", "updatedAt")
SELECT "id", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "totalKills", "lastKilledAt", "updatedAt"
FROM "UserKillStats_temp";

DROP TABLE "UserKillStats_temp";

-- Step 13: Create new indexes for GuildKillSummary
CREATE INDEX "GuildKillSummary_guildId_idx" ON "GuildKillSummary"("guildId");
CREATE INDEX "GuildKillSummary_guildId_npcType_idx" ON "GuildKillSummary"("guildId", "npcType");
CREATE UNIQUE INDEX "GuildKillSummary_guildId_world_npcId_key" ON "GuildKillSummary"("guildId", "world", "npcId");

-- Step 14: Create new indexes for NpcKillStats
CREATE INDEX "NpcKillStats_memberId_idx" ON "NpcKillStats"("memberId");
CREATE UNIQUE INDEX "NpcKillStats_guildId_memberId_world_npcId_key" ON "NpcKillStats"("guildId", "memberId", "world", "npcId");

-- Step 15: Create new index for UserKillStats
CREATE UNIQUE INDEX "UserKillStats_userId_world_npcId_key" ON "UserKillStats"("userId", "world", "npcId");

-- Step 16: Add foreign key for GuildKillSummary
ALTER TABLE "GuildKillSummary" ADD CONSTRAINT "GuildKillSummary_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
