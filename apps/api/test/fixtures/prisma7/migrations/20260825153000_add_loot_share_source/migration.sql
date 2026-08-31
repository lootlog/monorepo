-- CreateEnum
CREATE TYPE "LootShareSource" AS ENUM ('NONE', 'ITEM_OWNER', 'CHAT_MESSAGE');

-- AlterTable
ALTER TABLE "Loot"
ADD COLUMN "lootShareSource" "LootShareSource" NOT NULL DEFAULT 'NONE';

-- Existing non-empty shares were populated from chat messages before item-owner inference existed.
UPDATE "Loot"
SET "lootShareSource" = 'CHAT_MESSAGE'
WHERE "lootShare" <> '{}'::jsonb;
