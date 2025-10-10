/*
  Warnings:

  - Added the required column `losingTeam` to the `battles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `winningTeam` to the `battles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "battles" ADD COLUMN     "losingTeam" INTEGER NOT NULL,
ADD COLUMN     "winningTeam" INTEGER NOT NULL;
