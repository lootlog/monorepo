/*
  Warnings:

  - Added the required column `name` to the `ActivityActorSnapshot` table without a default value. This is not possible if the table is not empty.
  - Made the column `prof` on table `ActivityActorSnapshot` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ActivityActorSnapshot" ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "clanName" DROP NOT NULL,
ALTER COLUMN "prof" SET NOT NULL;
