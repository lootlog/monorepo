/*
  Warnings:

  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_LootToPlayer` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "UserLootlogPlayerConfig" DROP CONSTRAINT "UserLootlogPlayerConfig_playerId_fkey";

-- DropForeignKey
ALTER TABLE "_LootToPlayer" DROP CONSTRAINT "_LootToPlayer_B_fkey";

-- AlterTable
ALTER TABLE "Player" DROP CONSTRAINT "Player_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UserLootlogPlayerConfig" ALTER COLUMN "playerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "_LootToPlayer" DROP CONSTRAINT "_LootToPlayer_AB_pkey",
ALTER COLUMN "B" SET DATA TYPE TEXT,
ADD CONSTRAINT "_LootToPlayer_AB_pkey" PRIMARY KEY ("A", "B");

-- AddForeignKey
ALTER TABLE "UserLootlogPlayerConfig" ADD CONSTRAINT "UserLootlogPlayerConfig_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LootToPlayer" ADD CONSTRAINT "_LootToPlayer_B_fkey" FOREIGN KEY ("B") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
