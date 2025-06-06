/*
  Warnings:

  - The primary key for the `UserCharactersLootlogSettings` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "UserCharactersLootlogSettings" DROP CONSTRAINT "UserCharactersLootlogSettings_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "UserCharactersLootlogSettings_pkey" PRIMARY KEY ("id");
