-- CreateEnum
CREATE TYPE "PointsEditType" AS ENUM ('KILL_POINT', 'RANKING');

-- CreateTable
CREATE TABLE "EventPointsEditHistory" (
    "id" TEXT NOT NULL,
    "rankingId" TEXT NOT NULL,
    "previousPoints" INTEGER NOT NULL,
    "newPoints" INTEGER NOT NULL,
    "editType" "PointsEditType" NOT NULL,
    "editedByUserId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPointsEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPointsEditHistory_rankingId_editedAt_idx" ON "EventPointsEditHistory"("rankingId", "editedAt" DESC);

-- AddForeignKey
ALTER TABLE "EventPointsEditHistory" ADD CONSTRAINT "EventPointsEditHistory_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "EventRanking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
