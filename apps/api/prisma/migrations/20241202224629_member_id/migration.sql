/*
  Warnings:

  - You are about to drop the `_MemberToRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MemberToRole" DROP CONSTRAINT "_MemberToRole_A_fkey";

-- DropForeignKey
ALTER TABLE "_MemberToRole" DROP CONSTRAINT "_MemberToRole_B_fkey";

-- DropTable
DROP TABLE "_MemberToRole";

-- CreateTable
CREATE TABLE "MembersOnRoles" (
    "id" SERIAL NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembersOnRoles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembersOnRoles_memberId_roleId_key" ON "MembersOnRoles"("memberId", "roleId");

-- AddForeignKey
ALTER TABLE "MembersOnRoles" ADD CONSTRAINT "MembersOnRoles_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembersOnRoles" ADD CONSTRAINT "MembersOnRoles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
