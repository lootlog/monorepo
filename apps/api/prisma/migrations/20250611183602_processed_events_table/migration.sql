-- CreateTable
CREATE TABLE "ProcessedEvents" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedEvents_pkey" PRIMARY KEY ("id")
);
