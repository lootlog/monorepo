/*
  Warnings:

  - You are about to drop the column `autoCalculatePoints` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "autoCalculatePoints",
ADD COLUMN     "trackingDurationMultipliers" JSONB;

-- AlterTable
ALTER TABLE "EventKillPoint" ADD COLUMN     "trackingDurationMultiplier" DOUBLE PRECISION,
ADD COLUMN     "trackingDurationPercentage" DOUBLE PRECISION;
