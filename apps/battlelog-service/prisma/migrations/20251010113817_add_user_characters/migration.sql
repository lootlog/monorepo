-- CreateTable
CREATE TABLE "user_characters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_characters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_characters_userId_idx" ON "user_characters"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_characters_userId_characterId_world_key" ON "user_characters"("userId", "characterId", "world");
