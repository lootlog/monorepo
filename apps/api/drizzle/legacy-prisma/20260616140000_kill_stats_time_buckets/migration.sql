-- Create hourly user kill stats buckets
CREATE TABLE "UserKillStatsBucket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKillStatsBucket_pkey" PRIMARY KEY ("id")
);

-- Create hourly member participation buckets
CREATE TABLE "NpcKillStatsBucket" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "memberKills" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpcKillStatsBucket_pkey" PRIMARY KEY ("id")
);

-- Create hourly guild unique kill buckets
CREATE TABLE "GuildKillSummaryBucket" (
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
    "periodStart" TIMESTAMP(3) NOT NULL,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildKillSummaryBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserKillStatsBucket_userId_world_npcId_periodStart_key" ON "UserKillStatsBucket"("userId", "world", "npcId", "periodStart");
CREATE INDEX "UserKillStatsBucket_userId_periodStart_idx" ON "UserKillStatsBucket"("userId", "periodStart");
CREATE INDEX "UserKillStatsBucket_userId_npcType_periodStart_idx" ON "UserKillStatsBucket"("userId", "npcType", "periodStart");

CREATE UNIQUE INDEX "NpcKillStatsBucket_guildId_memberId_world_npcId_periodStart_key" ON "NpcKillStatsBucket"("guildId", "memberId", "world", "npcId", "periodStart");
CREATE INDEX "NpcKillStatsBucket_guildId_periodStart_idx" ON "NpcKillStatsBucket"("guildId", "periodStart");
CREATE INDEX "NpcKillStatsBucket_guildId_npcType_periodStart_idx" ON "NpcKillStatsBucket"("guildId", "npcType", "periodStart");
CREATE INDEX "NpcKillStatsBucket_memberId_periodStart_idx" ON "NpcKillStatsBucket"("memberId", "periodStart");

CREATE UNIQUE INDEX "GuildKillSummaryBucket_guildId_world_npcId_periodStart_key" ON "GuildKillSummaryBucket"("guildId", "world", "npcId", "periodStart");
CREATE INDEX "GuildKillSummaryBucket_guildId_periodStart_idx" ON "GuildKillSummaryBucket"("guildId", "periodStart");
CREATE INDEX "GuildKillSummaryBucket_guildId_npcType_periodStart_idx" ON "GuildKillSummaryBucket"("guildId", "npcType", "periodStart");

ALTER TABLE "NpcKillStatsBucket" ADD CONSTRAINT "NpcKillStatsBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NpcKillStatsBucket" ADD CONSTRAINT "NpcKillStatsBucket_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuildKillSummaryBucket" ADD CONSTRAINT "GuildKillSummaryBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
