/*
  Warnings:

  - The values [COMMON] on the enum `ItemRarity` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ItemRarity_new" AS ENUM ('UNIQUE', 'HEROIC', 'LEGENDARY', 'UPGRADED');
ALTER TABLE "Item" ALTER COLUMN "rarity" TYPE "ItemRarity_new" USING ("rarity"::text::"ItemRarity_new");
ALTER TABLE "LootlogConfigNpc" ALTER COLUMN "allowedRarities" TYPE "ItemRarity_new"[] USING ("allowedRarities"::text::"ItemRarity_new"[]);
ALTER TYPE "ItemRarity" RENAME TO "ItemRarity_old";
ALTER TYPE "ItemRarity_new" RENAME TO "ItemRarity";
DROP TYPE "ItemRarity_old";
COMMIT;
