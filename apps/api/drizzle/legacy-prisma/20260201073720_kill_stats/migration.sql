-- AlterTable
ALTER TABLE "UserCharactersLootlogSettings" ADD COLUMN     "trackKillsWhitelistGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Kill" (
    "id" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcIcon" TEXT,
    "killedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KillParticipant" (
    "id" TEXT NOT NULL,
    "killId" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "characterName" TEXT NOT NULL,
    "characterLvl" INTEGER NOT NULL,
    "characterProf" "Profession",
    "characterIcon" TEXT,
    "world" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KillParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildKill" (
    "id" TEXT NOT NULL,
    "killId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildKill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerKillStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "world" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerKillStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMemberKillStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMemberKillStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildKillStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildKillStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Kill_world_npcId_killedAt_idx" ON "Kill"("world", "npcId", "killedAt");

-- CreateIndex
CREATE INDEX "Kill_killedAt_idx" ON "Kill"("killedAt");

-- CreateIndex
CREATE INDEX "Kill_npcType_npcLvl_idx" ON "Kill"("npcType", "npcLvl");

-- CreateIndex
CREATE INDEX "KillParticipant_accountId_characterId_world_idx" ON "KillParticipant"("accountId", "characterId", "world");

-- CreateIndex
CREATE UNIQUE INDEX "KillParticipant_killId_characterId_key" ON "KillParticipant"("killId", "characterId");

-- CreateIndex
CREATE INDEX "GuildKill_guildId_createdAt_idx" ON "GuildKill"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildKill_memberId_idx" ON "GuildKill"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildKill_killId_guildId_key" ON "GuildKill"("killId", "guildId");

-- CreateIndex
CREATE INDEX "PlayerKillStats_userId_idx" ON "PlayerKillStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerKillStats_userId_accountId_characterId_world_npcType_key" ON "PlayerKillStats"("userId", "accountId", "characterId", "world", "npcType");

-- CreateIndex
CREATE INDEX "GuildMemberKillStats_guildId_npcType_idx" ON "GuildMemberKillStats"("guildId", "npcType");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMemberKillStats_guildId_memberId_npcType_key" ON "GuildMemberKillStats"("guildId", "memberId", "npcType");

-- CreateIndex
CREATE UNIQUE INDEX "GuildKillStats_guildId_npcType_key" ON "GuildKillStats"("guildId", "npcType");

-- AddForeignKey
ALTER TABLE "KillParticipant" ADD CONSTRAINT "KillParticipant_killId_fkey" FOREIGN KEY ("killId") REFERENCES "Kill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildKill" ADD CONSTRAINT "GuildKill_killId_fkey" FOREIGN KEY ("killId") REFERENCES "Kill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildKill" ADD CONSTRAINT "GuildKill_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildKill" ADD CONSTRAINT "GuildKill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMemberKillStats" ADD CONSTRAINT "GuildMemberKillStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMemberKillStats" ADD CONSTRAINT "GuildMemberKillStats_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildKillStats" ADD CONSTRAINT "GuildKillStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
