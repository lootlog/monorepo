-- AlterTable
ALTER TABLE "Loot" ADD COLUMN     "itemRarities" "ItemRarity"[],
ADD COLUMN     "mainNpcId" INTEGER,
ADD COLUMN     "mainNpcType" "NpcType",
ALTER COLUMN "items" DROP NOT NULL,
ALTER COLUMN "players" DROP NOT NULL,
ALTER COLUMN "npcs" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ItemSnapshot" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "statsHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "lvl" INTEGER,
    "rarity" "ItemRarity",
    "itemType" TEXT,
    "statRaw" TEXT NOT NULL,
    "statsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootItem" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "itemSnapshotId" INTEGER NOT NULL,

    CONSTRAINT "LootItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSnapshot" (
    "id" SERIAL NOT NULL,
    "world" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lvl" INTEGER NOT NULL,
    "prof" "Profession",
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootPlayer" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "playerSnapshotId" INTEGER NOT NULL,
    "hpp" INTEGER,

    CONSTRAINT "LootPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcSnapshot" (
    "id" SERIAL NOT NULL,
    "npcId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NpcType",
    "lvl" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpcSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootNpc" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "npcSnapshotId" INTEGER NOT NULL,

    CONSTRAINT "LootNpc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemSnapshot_statsSnapshot_idx" ON "ItemSnapshot" USING GIN ("statsSnapshot");

-- CreateIndex
CREATE INDEX "ItemSnapshot_rarity_lvl_idx" ON "ItemSnapshot"("rarity", "lvl");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSnapshot_itemId_statsHash_key" ON "ItemSnapshot"("itemId", "statsHash");

-- CreateIndex
CREATE INDEX "LootItem_lootId_idx" ON "LootItem"("lootId");

-- CreateIndex
CREATE INDEX "LootItem_itemSnapshotId_idx" ON "LootItem"("itemSnapshotId");

-- CreateIndex
CREATE INDEX "PlayerSnapshot_world_name_idx" ON "PlayerSnapshot"("world", "name");

-- CreateIndex
CREATE INDEX "PlayerSnapshot_accountId_characterId_idx" ON "PlayerSnapshot"("accountId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSnapshot_world_accountId_characterId_snapshotHash_key" ON "PlayerSnapshot"("world", "accountId", "characterId", "snapshotHash");

-- CreateIndex
CREATE INDEX "LootPlayer_lootId_idx" ON "LootPlayer"("lootId");

-- CreateIndex
CREATE INDEX "LootPlayer_playerSnapshotId_idx" ON "LootPlayer"("playerSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "NpcSnapshot_npcId_name_key" ON "NpcSnapshot"("npcId", "name");

-- CreateIndex
CREATE INDEX "LootNpc_lootId_idx" ON "LootNpc"("lootId");

-- CreateIndex
CREATE INDEX "LootNpc_npcSnapshotId_idx" ON "LootNpc"("npcSnapshotId");

-- CreateIndex
CREATE INDEX "Loot_world_source_createdAt_idx" ON "Loot"("world", "source", "createdAt");

-- CreateIndex
CREATE INDEX "Loot_mainNpcId_idx" ON "Loot"("mainNpcId");

-- CreateIndex
CREATE INDEX "Loot_itemRarities_idx" ON "Loot" USING GIN ("itemRarities");

-- AddForeignKey
ALTER TABLE "LootItem" ADD CONSTRAINT "LootItem_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootItem" ADD CONSTRAINT "LootItem_itemSnapshotId_fkey" FOREIGN KEY ("itemSnapshotId") REFERENCES "ItemSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootPlayer" ADD CONSTRAINT "LootPlayer_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootPlayer" ADD CONSTRAINT "LootPlayer_playerSnapshotId_fkey" FOREIGN KEY ("playerSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootNpc" ADD CONSTRAINT "LootNpc_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootNpc" ADD CONSTRAINT "LootNpc_npcSnapshotId_fkey" FOREIGN KEY ("npcSnapshotId") REFERENCES "NpcSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
