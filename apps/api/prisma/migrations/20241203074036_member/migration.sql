/*
  Warnings:

  - The primary key for the `Member` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Member` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `MembersOnRoles` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `memberId` on the `Loot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `userId` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `createdById` on the `Timer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Loot" DROP CONSTRAINT "Loot_memberId_guildId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_id_fkey";

-- DropForeignKey
ALTER TABLE "MembersOnRoles" DROP CONSTRAINT "MembersOnRoles_memberId_guildId_fkey";

-- DropForeignKey
ALTER TABLE "MembersOnRoles" DROP CONSTRAINT "MembersOnRoles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Timer" DROP CONSTRAINT "Timer_createdById_guildId_fkey";

-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "memberId",
ADD COLUMN     "memberId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Member" DROP CONSTRAINT "Member_pkey",
ADD COLUMN     "userId" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Member_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Timer" DROP COLUMN "createdById",
ADD COLUMN     "createdById" INTEGER NOT NULL;

-- DropTable
DROP TABLE "MembersOnRoles";

-- CreateTable
CREATE TABLE "_MemberToRole" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MemberToRole_AB_unique" ON "_MemberToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_MemberToRole_B_index" ON "_MemberToRole"("B");

-- CreateIndex
CREATE INDEX "Member_id_guildId_idx" ON "Member"("id", "guildId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loot" ADD CONSTRAINT "Loot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
