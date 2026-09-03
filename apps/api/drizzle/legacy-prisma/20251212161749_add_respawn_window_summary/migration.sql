-- AlterTable
ALTER TABLE "Timer" ADD COLUMN     "windowOpenedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EventRespawnWindowSummary" (
    "id" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "killId" TEXT,
    "windowOpenedAt" TIMESTAMP(3) NOT NULL,
    "windowClosedAt" TIMESTAMP(3) NOT NULL,
    "minSpawnTime" TIMESTAMP(3) NOT NULL,
    "maxSpawnTime" TIMESTAMP(3) NOT NULL,
    "wasManualClose" BOOLEAN NOT NULL DEFAULT false,
    "totalWindowSeconds" INTEGER NOT NULL,
    "totalCoverageSeconds" INTEGER NOT NULL,
    "totalUncoveredSeconds" INTEGER NOT NULL,
    "totalUnassignedSeconds" INTEGER NOT NULL,
    "coveragePercentage" DOUBLE PRECISION NOT NULL,
    "memberStats" JSONB NOT NULL,
    "mapStats" JSONB NOT NULL,
    "gapsTimeline" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRespawnWindowSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRespawnWindowSummary_killId_key" ON "EventRespawnWindowSummary"("killId");

-- CreateIndex
CREATE INDEX "EventRespawnWindowSummary_heroNpcId_idx" ON "EventRespawnWindowSummary"("heroNpcId");

-- CreateIndex
CREATE INDEX "EventRespawnWindowSummary_windowClosedAt_idx" ON "EventRespawnWindowSummary"("windowClosedAt");

-- AddForeignKey
ALTER TABLE "EventRespawnWindowSummary" ADD CONSTRAINT "EventRespawnWindowSummary_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRespawnWindowSummary" ADD CONSTRAINT "EventRespawnWindowSummary_killId_fkey" FOREIGN KEY ("killId") REFERENCES "EventHeroKill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
