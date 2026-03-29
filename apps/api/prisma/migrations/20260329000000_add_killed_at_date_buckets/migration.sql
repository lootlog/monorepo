-- Add killedAtDate column with sentinel default for existing rows
ALTER TABLE "GuildKillSummary" ADD COLUMN "killedAtDate" DATE NOT NULL DEFAULT '1970-01-01';
ALTER TABLE "NpcKillStats" ADD COLUMN "killedAtDate" DATE NOT NULL DEFAULT '1970-01-01';
ALTER TABLE "UserKillStats" ADD COLUMN "killedAtDate" DATE NOT NULL DEFAULT '1970-01-01';

-- Drop old unique indexes
DROP INDEX "GuildKillSummary_guildId_world_npcId_key";
DROP INDEX "NpcKillStats_guildId_memberId_world_npcId_key";
DROP INDEX "UserKillStats_userId_world_npcId_key";

-- Create new unique indexes including killedAtDate
CREATE UNIQUE INDEX "GuildKillSummary_guildId_world_npcId_killedAtDate_key" ON "GuildKillSummary"("guildId", "world", "npcId", "killedAtDate");
CREATE UNIQUE INDEX "NpcKillStats_guildId_memberId_world_npcId_killedAtDate_key" ON "NpcKillStats"("guildId", "memberId", "world", "npcId", "killedAtDate");
CREATE UNIQUE INDEX "UserKillStats_userId_world_npcId_killedAtDate_key" ON "UserKillStats"("userId", "world", "npcId", "killedAtDate");

-- Add indexes for date-filtered queries
CREATE INDEX "GuildKillSummary_guildId_killedAtDate_idx" ON "GuildKillSummary"("guildId", "killedAtDate");
CREATE INDEX "NpcKillStats_guildId_killedAtDate_idx" ON "NpcKillStats"("guildId", "killedAtDate");
CREATE INDEX "UserKillStats_userId_killedAtDate_idx" ON "UserKillStats"("userId", "killedAtDate");

-- Remove default so new inserts must provide the date explicitly
ALTER TABLE "GuildKillSummary" ALTER COLUMN "killedAtDate" DROP DEFAULT;
ALTER TABLE "NpcKillStats" ALTER COLUMN "killedAtDate" DROP DEFAULT;
ALTER TABLE "UserKillStats" ALTER COLUMN "killedAtDate" DROP DEFAULT;
