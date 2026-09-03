-- Drop old kill tracking tables
DROP TABLE IF EXISTS "GuildKill";
DROP TABLE IF EXISTS "KillParticipant";
DROP TABLE IF EXISTS "Kill";
DROP TABLE IF EXISTS "GuildMemberKillStats";
DROP TABLE IF EXISTS "GuildKillStats";
DROP TABLE IF EXISTS "PlayerKillStats";

-- Remove trackKillsWhitelistGuildIds from UserCharactersLootlogSettings
ALTER TABLE "UserCharactersLootlogSettings" DROP COLUMN IF EXISTS "trackKillsWhitelistGuildIds";

-- Create new NpcKillStats table
CREATE TABLE "NpcKillStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcIcon" TEXT,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpcKillStats_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "NpcKillStats_guildId_idx" ON "NpcKillStats"("guildId");
CREATE INDEX "NpcKillStats_guildId_npcType_idx" ON "NpcKillStats"("guildId", "npcType");
CREATE INDEX "NpcKillStats_guildId_memberId_idx" ON "NpcKillStats"("guildId", "memberId");
CREATE INDEX "NpcKillStats_memberId_npcId_idx" ON "NpcKillStats"("memberId", "npcId");

-- Create unique constraint
CREATE UNIQUE INDEX "NpcKillStats_guildId_memberId_characterId_world_npcId_key" ON "NpcKillStats"("guildId", "memberId", "characterId", "world", "npcId");

-- Add foreign key constraints
ALTER TABLE "NpcKillStats" ADD CONSTRAINT "NpcKillStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NpcKillStats" ADD CONSTRAINT "NpcKillStats_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
