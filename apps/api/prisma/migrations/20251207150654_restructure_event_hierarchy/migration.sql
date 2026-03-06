/*
  Warnings:

  - You are about to drop the column `mapName` on the `EventHeroNpc` table. All the data in the column will be lost.
  - You are about to drop the column `assignedMemberId` on the `EventMap` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `EventMap` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[heroNpcId,mapName]` on the table `EventMap` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `heroNpcId` to the `EventMap` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EventMap" DROP CONSTRAINT "EventMap_assignedMemberId_fkey";

-- DropForeignKey
ALTER TABLE "EventMap" DROP CONSTRAINT "EventMap_eventId_fkey";

-- DropIndex
DROP INDEX "EventMap_assignedMemberId_idx";

-- DropIndex
DROP INDEX "EventMap_eventId_mapName_key";

-- AlterTable
ALTER TABLE "EventHeroNpc" DROP COLUMN "mapName";

-- AlterTable
ALTER TABLE "EventMap" DROP COLUMN "assignedMemberId",
DROP COLUMN "eventId",
ADD COLUMN     "heroNpcId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "_EventMapToMember" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EventMapToMember_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventMapToMember_B_index" ON "_EventMapToMember"("B");

-- CreateIndex
CREATE UNIQUE INDEX "EventMap_heroNpcId_mapName_key" ON "EventMap"("heroNpcId", "mapName");

-- AddForeignKey
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventMapToMember" ADD CONSTRAINT "_EventMapToMember_A_fkey" FOREIGN KEY ("A") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventMapToMember" ADD CONSTRAINT "_EventMapToMember_B_fkey" FOREIGN KEY ("B") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
