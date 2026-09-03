/*
  Warnings:

  - You are about to drop the column `mainNpcId` on the `Loot` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Loot_mainNpcId_idx";

-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "mainNpcId",
ADD COLUMN     "mainNpcName" TEXT,
ADD COLUMN     "playerNames" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Loot_mainNpcName_idx" ON "Loot"("mainNpcName");
