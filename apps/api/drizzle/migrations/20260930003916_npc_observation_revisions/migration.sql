-- Drain pre-revision API and seed writers before this transactional migration:
-- their ON CONFLICT (npcId, name) target is intentionally removed.
-- Existing revisions and LootNpc links remain untouched. A NULL hash means that
-- the retained legacy row has not been independently reconstructed (LOO-38).
DROP INDEX "NpcSnapshot_npcId_name_key";--> statement-breakpoint
ALTER TABLE "NpcSnapshot" ADD COLUMN "identityNamespace" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "NpcSnapshot" ADD COLUMN "world" text;--> statement-breakpoint
ALTER TABLE "NpcSnapshot" ADD COLUMN "snapshotHash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "NpcSnapshot_npcId_snapshotHash_key" ON "NpcSnapshot" ("npcId","snapshotHash");