/*
  Warnings:

  - A unique constraint covering the columns `[characterId,accountId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `characterId` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Player_accountId_id_key";

-- AlterTable
CREATE SEQUENCE player_id_seq;
ALTER TABLE "Player" ADD COLUMN     "characterId" INTEGER NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('player_id_seq');
ALTER SEQUENCE player_id_seq OWNED BY "Player"."id";

-- CreateTable
CREATE TABLE "UserLootlogConfig" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLootlogConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_characterId_accountId_key" ON "Player"("characterId", "accountId");

-- AddForeignKey
ALTER TABLE "UserLootlogConfig" ADD CONSTRAINT "UserLootlogConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLootlogConfig" ADD CONSTRAINT "UserLootlogConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
