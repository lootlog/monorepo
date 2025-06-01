/*
  Warnings:

  - You are about to drop the column `discriminator` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `globalName` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `Member` table. All the data in the column will be lost.
  - Added the required column `name` to the `Member` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "discriminator",
DROP COLUMN "displayName",
DROP COLUMN "globalName",
DROP COLUMN "username",
ADD COLUMN     "name" TEXT NOT NULL;
