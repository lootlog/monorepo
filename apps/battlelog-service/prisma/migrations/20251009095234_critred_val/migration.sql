/*
  Warnings:

  - You are about to drop the column `legbonCritred` on the `battle_warriors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "battle_warriors" DROP COLUMN "legbonCritred",
ADD COLUMN     "legbonCritredValue" INTEGER NOT NULL DEFAULT 0;
