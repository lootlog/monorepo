/*
  Warnings:

  - Added the required column `maxSpawnTimeAtKill` to the `EventHeroKill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minSpawnTimeAtKill` to the `EventHeroKill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `appliedMultiplier` to the `EventKillPoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basePoints` to the `EventKillPoint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "basePointsPerKill" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "EventHeroKill" ADD COLUMN     "maxSpawnTimeAtKill" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "minSpawnTimeAtKill" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "timerCreatedById" INTEGER;

-- AlterTable
ALTER TABLE "EventKillPoint" ADD COLUMN     "appliedMultiplier" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "basePoints" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "EventHeroKill" ADD CONSTRAINT "EventHeroKill_timerCreatedById_fkey" FOREIGN KEY ("timerCreatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
