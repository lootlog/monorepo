/*
  Warnings:

  - A unique constraint covering the columns `[userId,guildId]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_guildId_key" ON "Member"("userId", "guildId");
