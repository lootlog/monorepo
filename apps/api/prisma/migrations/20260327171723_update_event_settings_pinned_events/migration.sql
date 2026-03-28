/*
  Warnings:

  - You are about to drop the column `pinnedEventId` on the `UserGuildEventSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserGuildEventSettings" DROP COLUMN "pinnedEventId",
ADD COLUMN     "pinnedEvents" TEXT[] DEFAULT ARRAY[]::TEXT[];
