/*
  Warnings:

  - You are about to drop the column `latestRespawnSeconds` on the `Timer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Timer" DROP COLUMN "latestRespawnSeconds",
ADD COLUMN     "latestRespawnRandomness" INTEGER NOT NULL DEFAULT 0;
