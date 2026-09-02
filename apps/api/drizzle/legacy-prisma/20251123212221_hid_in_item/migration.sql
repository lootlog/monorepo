-- Add hid column if missing, then drop default to match Prisma schema
ALTER TABLE "LootItem" ADD COLUMN "hid" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LootItem" ALTER COLUMN "hid" DROP DEFAULT;
