/*
  Warnings:

  - The `prof` column on the `ActivityActorSnapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('WARRIOR', 'PALADIN', 'HUNTER', 'MAGE', 'BLADE_DANCER', 'TRACKER');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "world" TEXT;

-- AlterTable
ALTER TABLE "ActivityActorSnapshot" ADD COLUMN     "clanId" INTEGER,
DROP COLUMN "prof",
ADD COLUMN     "prof" "Profession";
