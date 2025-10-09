/*
  Warnings:

  - You are about to drop the column `legbonFacade` on the `battle_warriors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "battle_warriors" DROP COLUMN "legbonFacade",
ADD COLUMN     "legbonFacadeValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "legbonPunctureValue" INTEGER NOT NULL DEFAULT 0;
