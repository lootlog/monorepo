/*
  Warnings:

  - You are about to drop the column `itemRarities` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `mainNpcName` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `mainNpcType` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `playerNames` on the `Loot` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."ItemSnapshot_statsSnapshot_idx";

-- DropIndex
DROP INDEX "public"."Loot_itemRarities_idx";

-- DropIndex
DROP INDEX "public"."Loot_mainNpcName_idx";

-- DropIndex
DROP INDEX "public"."Loot_world_source_createdAt_idx";

-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "itemRarities",
DROP COLUMN "mainNpcName",
DROP COLUMN "mainNpcType",
DROP COLUMN "playerNames";

-- CreateIndex
CREATE INDEX "Loot_world_createdAt_idx" ON "Loot"("world", "createdAt");
