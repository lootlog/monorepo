/*
  Warnings:

  - A unique constraint covering the columns `[eventId,memberId,heroNpcName]` on the table `EventRanking` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `heroNpcName` to the `EventRanking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CoverageGapType" AS ENUM ('UNASSIGNED', 'UNCOVERED');

-- DropIndex
DROP INDEX "EventRanking_eventId_memberId_key";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "assignmentTimeoutMinutes" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "autoCalculatePoints" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "EventRanking" ADD COLUMN     "heroNpcName" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EventMapCoverageGap" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "gapType" "CoverageGapType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,

    CONSTRAINT "EventMapCoverageGap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMapCoverageGap_mapId_gapType_endedAt_idx" ON "EventMapCoverageGap"("mapId", "gapType", "endedAt");

-- CreateIndex
CREATE INDEX "EventMapCoverageGap_heroNpcId_endedAt_idx" ON "EventMapCoverageGap"("heroNpcId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventRanking_eventId_memberId_heroNpcName_key" ON "EventRanking"("eventId", "memberId", "heroNpcName");

-- AddForeignKey
ALTER TABLE "EventMapCoverageGap" ADD CONSTRAINT "EventMapCoverageGap_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapCoverageGap" ADD CONSTRAINT "EventMapCoverageGap_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
