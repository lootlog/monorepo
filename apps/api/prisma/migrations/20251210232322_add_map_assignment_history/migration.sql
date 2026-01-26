-- CreateTable
CREATE TABLE "EventMapAssignmentHistory" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "EventMapAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMapAssignmentHistory_mapId_assignedAt_idx" ON "EventMapAssignmentHistory"("mapId", "assignedAt");

-- CreateIndex
CREATE INDEX "EventMapAssignmentHistory_heroNpcId_assignedAt_idx" ON "EventMapAssignmentHistory"("heroNpcId", "assignedAt");

-- CreateIndex
CREATE INDEX "EventMapAssignmentHistory_memberId_idx" ON "EventMapAssignmentHistory"("memberId");

-- AddForeignKey
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
