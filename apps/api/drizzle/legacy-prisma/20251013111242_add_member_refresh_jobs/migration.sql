-- CreateEnum
CREATE TYPE "RefreshJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "MemberRefreshJob" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "RefreshJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "processedMembers" INTEGER NOT NULL DEFAULT 0,
    "failedMembers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MemberRefreshJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberRefreshJob_guildId_idx" ON "MemberRefreshJob"("guildId");

-- CreateIndex
CREATE INDEX "MemberRefreshJob_status_idx" ON "MemberRefreshJob"("status");
