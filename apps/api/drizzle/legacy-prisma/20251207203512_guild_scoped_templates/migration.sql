/*
  Warnings:

  - You are about to drop the column `maps` on the `EventMapTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `world` on the `EventMapTemplate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[guildId,name]` on the table `EventMapTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guildId` to the `EventMapTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EventMapTemplate_name_world_key";

-- AlterTable
ALTER TABLE "EventMapTemplate" DROP COLUMN "maps",
DROP COLUMN "world",
ADD COLUMN     "guildId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "EventMapTemplate_guildId_idx" ON "EventMapTemplate"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMapTemplate_guildId_name_key" ON "EventMapTemplate"("guildId", "name");

-- AddForeignKey
ALTER TABLE "EventMapTemplate" ADD CONSTRAINT "EventMapTemplate_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
