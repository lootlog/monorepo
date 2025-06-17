/*
  Warnings:

  - You are about to drop the `ProcessedEvents` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Timer" ADD COLUMN     "latestRespBaseSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "latestRespawnSeconds" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "ProcessedEvents";
