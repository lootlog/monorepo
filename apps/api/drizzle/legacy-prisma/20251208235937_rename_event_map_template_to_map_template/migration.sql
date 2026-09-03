/*
  Warnings:

  - You are about to drop the `EventMapTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EventMapTemplate" DROP CONSTRAINT "EventMapTemplate_guildId_fkey";

-- DropTable
DROP TABLE "EventMapTemplate";

-- CreateTable
CREATE TABLE "MapTemplate" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapTemplate_guildId_idx" ON "MapTemplate"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "MapTemplate_guildId_name_key" ON "MapTemplate"("guildId", "name");

-- AddForeignKey
ALTER TABLE "MapTemplate" ADD CONSTRAINT "MapTemplate_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
