-- CreateTable
CREATE TABLE "UserKillStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "characterName" TEXT NOT NULL,
    "characterLvl" INTEGER NOT NULL,
    "characterProf" TEXT,
    "characterIcon" TEXT,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcIcon" TEXT,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKillStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserKillStats_userId_idx" ON "UserKillStats"("userId");

-- CreateIndex
CREATE INDEX "UserKillStats_userId_characterId_idx" ON "UserKillStats"("userId", "characterId");

-- CreateIndex
CREATE INDEX "UserKillStats_userId_npcType_idx" ON "UserKillStats"("userId", "npcType");

-- CreateIndex
CREATE UNIQUE INDEX "UserKillStats_userId_characterId_world_npcId_key" ON "UserKillStats"("userId", "characterId", "world", "npcId");
