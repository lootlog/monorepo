/*
  Warnings:

  - Changed the type of `prof` on the `ActivityActorSnapshot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ActivityActorSnapshot" DROP COLUMN "prof",
ADD COLUMN     "prof" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Profession";
