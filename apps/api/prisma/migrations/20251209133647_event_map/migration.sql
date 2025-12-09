/*
  Warnings:

  - A unique constraint covering the columns `[heroNpcId,mapId]` on the table `EventMap` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mapId` to the `EventMap` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EventMap_heroNpcId_mapName_key";

-- AlterTable
ALTER TABLE "EventMap" ADD COLUMN     "mapId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "EventMap_mapId_idx" ON "EventMap"("mapId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMap_heroNpcId_mapId_key" ON "EventMap"("heroNpcId", "mapId");
