-- AlterTable
ALTER TABLE "EventMapCoverageGap" ADD COLUMN     "hadAssignedMembers" BOOLEAN;

-- Data migration: Set hadAssignedMembers based on existing gapType
-- UNCOVERED gaps had assigned members (true)
-- UNASSIGNED gaps had no assigned members (false)
UPDATE "EventMapCoverageGap" SET "hadAssignedMembers" = true WHERE "gapType" = 'UNCOVERED';
UPDATE "EventMapCoverageGap" SET "hadAssignedMembers" = false WHERE "gapType" = 'UNASSIGNED';
