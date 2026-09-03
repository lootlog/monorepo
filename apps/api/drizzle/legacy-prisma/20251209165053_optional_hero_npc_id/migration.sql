-- AlterTable
ALTER TABLE "EventHeroNpc" ALTER COLUMN "npcId" DROP NOT NULL;

-- DropIndex
DROP INDEX "EventHeroNpc_eventId_npcId_key";

-- CreateIndex
CREATE UNIQUE INDEX "EventHeroNpc_eventId_npcName_key" ON "EventHeroNpc"("eventId", "npcName");
