-- CreateTable
CREATE TABLE "UserCharactersLootlogSettings" (
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collectLootBlaclistGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "addTimersBlacklistGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "UserCharactersLootlogSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCharactersLootlogSettings_userId_accountId_key" ON "UserCharactersLootlogSettings"("userId", "accountId");
