-- CreateEnum
CREATE TYPE "TimerHistoryAction" AS ENUM ('CREATE', 'RESET', 'DELETE', 'RESTORE');

-- AlterTable
ALTER TABLE "Timer"
ADD COLUMN "actorCharacterSnapshotId" INTEGER,
ADD COLUMN "actorCharacterLvl" INTEGER;

-- CreateTable
CREATE TABLE "TimerHistoryEntry" (
  "id" SERIAL NOT NULL,
  "guildId" TEXT NOT NULL,
  "world" TEXT NOT NULL,
  "timerKey" TEXT NOT NULL,
  "npcId" INTEGER NOT NULL,
  "npc" JSONB NOT NULL,
  "action" "TimerHistoryAction" NOT NULL,
  "actorMemberId" INTEGER NOT NULL,
  "actorCharacterSnapshotId" INTEGER,
  "actorCharacterLvl" INTEGER,
  "minSpawnTime" TIMESTAMP(3),
  "maxSpawnTime" TIMESTAMP(3),
  "latestRespBaseSeconds" INTEGER,
  "latestRespawnRandomness" INTEGER,
  "wasReset" BOOLEAN,
  "windowOpenedAt" TIMESTAMP(3),
  "timerCreatedById" INTEGER,
  "timerActorCharacterSnapshotId" INTEGER,
  "timerActorCharacterLvl" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TimerHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Timer_actorCharacterSnapshotId_idx" ON "Timer"("actorCharacterSnapshotId");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_guildId_world_timerKey_createdAt_idx" ON "TimerHistoryEntry"("guildId", "world", "timerKey", "createdAt");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_guildId_world_createdAt_idx" ON "TimerHistoryEntry"("guildId", "world", "createdAt");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_actorMemberId_idx" ON "TimerHistoryEntry"("actorMemberId");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_actorCharacterSnapshotId_idx" ON "TimerHistoryEntry"("actorCharacterSnapshotId");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_timerCreatedById_idx" ON "TimerHistoryEntry"("timerCreatedById");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_timerActorCharacterSnapshotId_idx" ON "TimerHistoryEntry"("timerActorCharacterSnapshotId");

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_actorCharacterSnapshotId_fkey" FOREIGN KEY ("actorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_actorCharacterSnapshotId_fkey" FOREIGN KEY ("actorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_timerCreatedById_fkey" FOREIGN KEY ("timerCreatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_timerActorCharacterSnapshotId_fkey" FOREIGN KEY ("timerActorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
