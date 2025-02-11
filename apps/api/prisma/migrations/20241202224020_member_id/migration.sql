-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('ADMIN', 'LOOTLOG_MANAGE', 'LOOTLOG_READ', 'LOOTLOG_WRITE');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('OWNER', 'ADMIN', 'USER', 'BOT');

-- CreateEnum
CREATE TYPE "NpcType" AS ENUM ('COMMON', 'ELITE', 'ELITE2', 'ELITE3', 'HERO', 'EVENT_HERO', 'TITAN', 'COLOSSUS', 'NPC');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ONE_HAND_WEAPON', 'TWO_HAND_WEAPON', 'ONE_AND_HALF_HAND_WEAPON', 'DISTANCE_WEAPON', 'HELP_WEAPON', 'WAND_WEAPON', 'ORB_WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'RING', 'NECKLACE', 'SHIELD', 'NEUTRAL', 'CONSUME', 'GOLD', 'KEYS', 'QUEST', 'RENEWABLE', 'ARROWS', 'TALISMAN', 'BOOK', 'BAG', 'BLESS', 'UPGRADE', 'RECIPE', 'COINAGE', 'QUIVER', 'OUTFITS', 'PETS', 'TELEPORTS');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMMON', 'UNIQUE', 'HEROIC', 'LEGENDARY', 'UPGRADED');

-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('WARRIOR', 'PALADIN', 'HUNTER', 'MAGE', 'BLADE_DANCER', 'TRACKER');

-- CreateEnum
CREATE TYPE "LootSource" AS ENUM ('LOOTBOX', 'DIALOG', 'FIGHT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "discriminator" TEXT NOT NULL,
    "banner" TEXT,
    "globalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "ownerId" TEXT NOT NULL,
    "vanityUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER,
    "position" INTEGER,
    "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "MemberType" NOT NULL DEFAULT 'USER',
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lvl" INTEGER NOT NULL,
    "prof" TEXT,
    "icon" TEXT NOT NULL,
    "wt" INTEGER NOT NULL,
    "type" "NpcType" NOT NULL,
    "location" TEXT DEFAULT '',
    "margonemType" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lvl" INTEGER NOT NULL,
    "prof" "Profession" NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timer" (
    "id" SERIAL NOT NULL,
    "createdById" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "world" TEXT NOT NULL,
    "minSpawnTime" TIMESTAMP(3) NOT NULL,
    "maxSpawnTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "pr" INTEGER NOT NULL,
    "prc" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "lvl" INTEGER NOT NULL,
    "prof" "Profession"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loot" (
    "id" SERIAL NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "source" "LootSource" NOT NULL,
    "location" TEXT NOT NULL,
    "diedPlayers" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootlogConfigNpc" (
    "id" SERIAL NOT NULL,
    "lootlogConfigId" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "allowedRarities" "ItemRarity"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootlogConfigNpc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootlogConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootlogConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemberToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ItemToLoot" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_LootToPlayer" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_LootToNpc" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "Role_id_guildId_idx" ON "Role"("id", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_id_guildId_key" ON "Role"("id", "guildId");

-- CreateIndex
CREATE INDEX "Member_id_guildId_idx" ON "Member"("id", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_id_guildId_key" ON "Member"("id", "guildId");

-- CreateIndex
CREATE INDEX "Player_id_guildId_idx" ON "Player"("id", "guildId");

-- CreateIndex
CREATE INDEX "Timer_npcId_guildId_idx" ON "Timer"("npcId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Loot_uniqueId_key" ON "Loot"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "_MemberToRole_AB_unique" ON "_MemberToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_MemberToRole_B_index" ON "_MemberToRole"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemToLoot_AB_unique" ON "_ItemToLoot"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemToLoot_B_index" ON "_ItemToLoot"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LootToPlayer_AB_unique" ON "_LootToPlayer"("A", "B");

-- CreateIndex
CREATE INDEX "_LootToPlayer_B_index" ON "_LootToPlayer"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LootToNpc_AB_unique" ON "_LootToNpc"("A", "B");

-- CreateIndex
CREATE INDEX "_LootToNpc_B_index" ON "_LootToNpc"("B");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "Npc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loot" ADD CONSTRAINT "Loot_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loot" ADD CONSTRAINT "Loot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootlogConfigNpc" ADD CONSTRAINT "LootlogConfigNpc_lootlogConfigId_fkey" FOREIGN KEY ("lootlogConfigId") REFERENCES "LootlogConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToLoot" ADD CONSTRAINT "_ItemToLoot_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToLoot" ADD CONSTRAINT "_ItemToLoot_B_fkey" FOREIGN KEY ("B") REFERENCES "Loot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LootToPlayer" ADD CONSTRAINT "_LootToPlayer_A_fkey" FOREIGN KEY ("A") REFERENCES "Loot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LootToPlayer" ADD CONSTRAINT "_LootToPlayer_B_fkey" FOREIGN KEY ("B") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LootToNpc" ADD CONSTRAINT "_LootToNpc_A_fkey" FOREIGN KEY ("A") REFERENCES "Loot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LootToNpc" ADD CONSTRAINT "_LootToNpc_B_fkey" FOREIGN KEY ("B") REFERENCES "Npc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
