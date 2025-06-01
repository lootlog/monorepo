/*
  Warnings:

  - You are about to drop the `PlayerLootlogConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_userId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerLootlogConfig" DROP CONSTRAINT "PlayerLootlogConfig_userId_fkey";

-- DropTable
DROP TABLE "PlayerLootlogConfig";

-- DropTable
DROP TABLE "User";
