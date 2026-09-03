-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMap" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mapName" TEXT NOT NULL,
    "assignedMemberId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHeroNpc" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "mapName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHeroNpc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPresenceLog" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "isAfk" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "EventPresenceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHeroKill" (
    "id" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "killedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHeroKill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventKillPoint" (
    "id" TEXT NOT NULL,
    "killId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "mapName" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "timeOnMapSeconds" INTEGER NOT NULL,
    "afkPercentage" DOUBLE PRECISION NOT NULL,
    "wasPresent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventKillPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRanking" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "avgAfkPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMapTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "maps" TEXT[],
    "heroNpcs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMapTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_guildId_active_idx" ON "Event"("guildId", "active");

-- CreateIndex
CREATE INDEX "Event_world_idx" ON "Event"("world");

-- CreateIndex
CREATE INDEX "EventMap_assignedMemberId_idx" ON "EventMap"("assignedMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMap_eventId_mapName_key" ON "EventMap"("eventId", "mapName");

-- CreateIndex
CREATE INDEX "EventHeroNpc_npcId_idx" ON "EventHeroNpc"("npcId");

-- CreateIndex
CREATE UNIQUE INDEX "EventHeroNpc_eventId_npcId_key" ON "EventHeroNpc"("eventId", "npcId");

-- CreateIndex
CREATE INDEX "EventPresenceLog_mapId_memberId_idx" ON "EventPresenceLog"("mapId", "memberId");

-- CreateIndex
CREATE INDEX "EventPresenceLog_startedAt_endedAt_idx" ON "EventPresenceLog"("startedAt", "endedAt");

-- CreateIndex
CREATE INDEX "EventHeroKill_heroNpcId_idx" ON "EventHeroKill"("heroNpcId");

-- CreateIndex
CREATE INDEX "EventHeroKill_killedAt_idx" ON "EventHeroKill"("killedAt");

-- CreateIndex
CREATE INDEX "EventKillPoint_memberId_idx" ON "EventKillPoint"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "EventKillPoint_killId_memberId_mapName_key" ON "EventKillPoint"("killId", "memberId", "mapName");

-- CreateIndex
CREATE INDEX "EventRanking_eventId_totalPoints_idx" ON "EventRanking"("eventId", "totalPoints" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "EventRanking_eventId_memberId_key" ON "EventRanking"("eventId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMapTemplate_name_world_key" ON "EventMapTemplate"("name", "world");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHeroNpc" ADD CONSTRAINT "EventHeroNpc_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPresenceLog" ADD CONSTRAINT "EventPresenceLog_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPresenceLog" ADD CONSTRAINT "EventPresenceLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHeroKill" ADD CONSTRAINT "EventHeroKill_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventKillPoint" ADD CONSTRAINT "EventKillPoint_killId_fkey" FOREIGN KEY ("killId") REFERENCES "EventHeroKill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventKillPoint" ADD CONSTRAINT "EventKillPoint_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRanking" ADD CONSTRAINT "EventRanking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRanking" ADD CONSTRAINT "EventRanking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
