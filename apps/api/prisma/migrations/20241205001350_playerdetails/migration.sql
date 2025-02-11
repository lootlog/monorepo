/*
  Warnings:

  - Added the required column `accountId` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `characterId` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "accountId" INTEGER NOT NULL,
ADD COLUMN     "characterId" INTEGER NOT NULL;
