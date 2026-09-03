-- Add userId column for personal stats queries
ALTER TABLE "NpcKillStats" ADD COLUMN "userId" TEXT;

-- Add character fields (updated on each kill)
ALTER TABLE "NpcKillStats" ADD COLUMN "characterName" TEXT;
ALTER TABLE "NpcKillStats" ADD COLUMN "characterLvl" INTEGER;
ALTER TABLE "NpcKillStats" ADD COLUMN "characterProf" TEXT;
ALTER TABLE "NpcKillStats" ADD COLUMN "characterIcon" TEXT;

-- Backfill userId from Member table
UPDATE "NpcKillStats" ns
SET "userId" = m."userId"
FROM "Member" m
WHERE ns."memberId" = m."id";

-- Backfill character fields with placeholder values (will be updated on next kill)
UPDATE "NpcKillStats"
SET "characterName" = 'Unknown',
    "characterLvl" = 0
WHERE "characterName" IS NULL;

-- Make required fields NOT NULL after backfill
ALTER TABLE "NpcKillStats" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "NpcKillStats" ALTER COLUMN "characterName" SET NOT NULL;
ALTER TABLE "NpcKillStats" ALTER COLUMN "characterLvl" SET NOT NULL;

-- Create indexes for personal stats queries
CREATE INDEX "NpcKillStats_userId_idx" ON "NpcKillStats"("userId");
CREATE INDEX "NpcKillStats_userId_characterId_idx" ON "NpcKillStats"("userId", "characterId");
