/*
  Warnings:

  - A unique constraint covering the columns `[accountId,id]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Player_accountId_id_key" ON "Player"("accountId", "id");
