/*
  Warnings:

  - The primary key for the `Timer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uniqueId` on the `Timer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Timer_uniqueId_key";

-- AlterTable
ALTER TABLE "Timer" DROP CONSTRAINT "Timer_pkey",
DROP COLUMN "uniqueId",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Timer_pkey" PRIMARY KEY ("guildId", "world", "npcId");
DROP SEQUENCE "Timer_id_seq";
