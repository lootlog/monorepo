-- AlterTable
ALTER TABLE "EventMap" ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "EventMapLocation" (
    "id" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMapLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMapLocation_heroNpcId_order_idx" ON "EventMapLocation"("heroNpcId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "EventMapLocation_heroNpcId_name_key" ON "EventMapLocation"("heroNpcId", "name");

-- CreateIndex
CREATE INDEX "EventMap_locationId_idx" ON "EventMap"("locationId");

-- AddForeignKey
ALTER TABLE "EventMapLocation" ADD CONSTRAINT "EventMapLocation_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "EventMapLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
