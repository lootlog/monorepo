-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('OWNER', 'ADMIN', 'LOOTLOG_MANAGE', 'LOOTLOG_READ', 'LOOTLOG_WRITE', 'LOOTLOG_READ_TIMERS_TITANS', 'LOOTLOG_READ_LOOTS_TITANS', 'LOOTLOG_CHAT_READ', 'LOOTLOG_CHAT_WRITE', 'LOOTLOG_NOTIFICATIONS_SEND', 'LOOTLOG_NOTIFICATIONS_READ');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('OWNER', 'ADMIN', 'USER', 'BOT');

-- CreateEnum
CREATE TYPE "NpcType" AS ENUM ('COMMON', 'ELITE', 'ELITE2', 'ELITE3', 'HERO', 'EVENT_HERO', 'TITAN', 'COLOSSUS', 'NPC');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ONE_HAND_WEAPON', 'TWO_HAND_WEAPON', 'ONE_AND_HALF_HAND_WEAPON', 'DISTANCE_WEAPON', 'HELP_WEAPON', 'WAND_WEAPON', 'ORB_WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'RING', 'NECKLACE', 'SHIELD', 'NEUTRAL', 'CONSUME', 'GOLD', 'KEYS', 'QUEST', 'RENEWABLE', 'ARROWS', 'TALISMAN', 'BOOK', 'BAG', 'BLESS', 'UPGRADE', 'RECIPE', 'COINAGE', 'QUIVER', 'OUTFITS', 'PETS', 'TELEPORTS');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('UNIQUE', 'HEROIC', 'LEGENDARY', 'UPGRADED');

-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('WARRIOR', 'PALADIN', 'HUNTER', 'MAGE', 'BLADE_DANCER', 'TRACKER');

-- CreateEnum
CREATE TYPE "LootSource" AS ENUM ('LOOTBOX', 'DIALOG', 'FIGHT');

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
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "MemberType" NOT NULL DEFAULT 'USER',
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "banner" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timer" (
    "createdById" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "world" TEXT NOT NULL,
    "minSpawnTime" TIMESTAMP(3) NOT NULL,
    "maxSpawnTime" TIMESTAMP(3) NOT NULL,
    "latestRespBaseSeconds" INTEGER NOT NULL DEFAULT 0,
    "latestRespawnRandomness" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "npc" JSONB NOT NULL,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("guildId","world","npcId")
);

-- CreateTable
CREATE TABLE "Loot" (
    "id" SERIAL NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "world" TEXT NOT NULL,
    "source" "LootSource" NOT NULL,
    "location" TEXT NOT NULL,
    "players" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "npcs" JSONB NOT NULL,

    CONSTRAINT "Loot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "icon" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "prof" "Profession" NOT NULL,
    "lvl" INTEGER NOT NULL,
    "pr" INTEGER NOT NULL,
    "prc" INTEGER NOT NULL,
    "stat" TEXT NOT NULL,
    "lootId" INTEGER,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "prof" "Profession" NOT NULL,
    "lvl" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lootId" INTEGER,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lvl" INTEGER NOT NULL,
    "prof" "Profession" NOT NULL,
    "type" "NpcType" NOT NULL,
    "margonemType" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "wt" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lootId" INTEGER,

    CONSTRAINT "Npc_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "UserCharactersLootlogSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collectLootBlaclistGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "addTimersBlacklistGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "UserCharactersLootlogSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemberToRole" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MemberToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_vanityUrl_key" ON "Guild"("vanityUrl");

-- CreateIndex
CREATE INDEX "Guild_vanityUrl_idx" ON "Guild"("vanityUrl");

-- CreateIndex
CREATE INDEX "Role_id_guildId_idx" ON "Role"("id", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_id_guildId_key" ON "Role"("id", "guildId");

-- CreateIndex
CREATE INDEX "Member_id_guildId_idx" ON "Member"("id", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_guildId_key" ON "Member"("userId", "guildId");

-- CreateIndex
CREATE INDEX "Timer_npcId_guildId_idx" ON "Timer"("npcId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Loot_uniqueId_key" ON "Loot"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCharactersLootlogSettings_userId_accountId_characterId_key" ON "UserCharactersLootlogSettings"("userId", "accountId", "characterId");

-- CreateIndex
CREATE INDEX "_MemberToRole_B_index" ON "_MemberToRole"("B");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
