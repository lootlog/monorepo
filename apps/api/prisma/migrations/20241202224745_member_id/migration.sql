/*
  Warnings:

  - The primary key for the `Member` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `guildId` to the `MembersOnRoles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Loot" DROP CONSTRAINT "Loot_memberId_fkey";

-- DropForeignKey
ALTER TABLE "MembersOnRoles" DROP CONSTRAINT "MembersOnRoles_memberId_fkey";

-- DropForeignKey
ALTER TABLE "Timer" DROP CONSTRAINT "Timer_createdById_fkey";

-- DropIndex
DROP INDEX "Member_id_guildId_key";

-- AlterTable
ALTER TABLE "Member" DROP CONSTRAINT "Member_pkey",
ADD CONSTRAINT "Member_pkey" PRIMARY KEY ("id", "guildId");

-- AlterTable
ALTER TABLE "MembersOnRoles" ADD COLUMN     "guildId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "MembersOnRoles" ADD CONSTRAINT "MembersOnRoles_memberId_guildId_fkey" FOREIGN KEY ("memberId", "guildId") REFERENCES "Member"("id", "guildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdById_guildId_fkey" FOREIGN KEY ("createdById", "guildId") REFERENCES "Member"("id", "guildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loot" ADD CONSTRAINT "Loot_memberId_guildId_fkey" FOREIGN KEY ("memberId", "guildId") REFERENCES "Member"("id", "guildId") ON DELETE RESTRICT ON UPDATE CASCADE;
