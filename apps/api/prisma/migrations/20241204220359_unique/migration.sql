/*
  Warnings:

  - A unique constraint covering the columns `[uniqueId]` on the table `Timer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uniqueId` to the `Timer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Timer" ADD COLUMN     "uniqueId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Timer_uniqueId_key" ON "Timer"("uniqueId");
