-- CreateTable
CREATE TABLE "LootComment" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LootComment_lootId_idx" ON "LootComment"("lootId");

-- AddForeignKey
ALTER TABLE "LootComment" ADD CONSTRAINT "LootComment_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootComment" ADD CONSTRAINT "LootComment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
