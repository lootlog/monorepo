-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LOOT_EVENT', 'TIMER_EVENT', 'CONNECT_EVENT', 'DISCONNECT_EVENT');

-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('GAME', 'WEB_APP');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ActivitySource" NOT NULL,
    "details" JSONB,
    "actorSnapshotId" TEXT,
    "lootContextId" TEXT,
    "timerContextId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityActorSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" INTEGER,
    "characterId" INTEGER,
    "clanName" TEXT,
    "icon" TEXT,
    "lvl" INTEGER,
    "prof" TEXT,
    "source" "ActivitySource" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityActorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLootContext" (
    "id" TEXT NOT NULL,
    "actorSnapshotId" TEXT NOT NULL,
    "lootId" INTEGER NOT NULL,
    "activityId" TEXT,

    CONSTRAINT "ActivityLootContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTimerContext" (
    "id" TEXT NOT NULL,
    "actorSnapshotId" TEXT NOT NULL,
    "npcName" TEXT NOT NULL,
    "activityId" TEXT,

    CONSTRAINT "ActivityTimerContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_createdAt_guildId_idx" ON "Activity"("createdAt" DESC, "guildId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_userId_idx" ON "Activity"("createdAt" DESC, "userId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_type_idx" ON "Activity"("createdAt" DESC, "type");

-- CreateIndex
CREATE INDEX "Activity_guildId_createdAt_idx" ON "Activity"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityActorSnapshot_fingerprint_key" ON "ActivityActorSnapshot"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLootContext_activityId_key" ON "ActivityLootContext"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityTimerContext_activityId_key" ON "ActivityTimerContext"("activityId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorSnapshotId_fkey" FOREIGN KEY ("actorSnapshotId") REFERENCES "ActivityActorSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLootContext" ADD CONSTRAINT "ActivityLootContext_actorSnapshotId_fkey" FOREIGN KEY ("actorSnapshotId") REFERENCES "ActivityActorSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLootContext" ADD CONSTRAINT "ActivityLootContext_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimerContext" ADD CONSTRAINT "ActivityTimerContext_actorSnapshotId_fkey" FOREIGN KEY ("actorSnapshotId") REFERENCES "ActivityActorSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimerContext" ADD CONSTRAINT "ActivityTimerContext_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
