-- LOO-250: retained log of revision identity changes made by the legacy
-- association repair (a revision promoted to its game edition, or one whose
-- hash moved to a promoted revision), with the previous values for rollback.
-- Creates one empty table; no existing row changes here.
CREATE TABLE "LegacyRepairSnapshot" (
	"runId" text,
	"snapshotTable" text,
	"snapshotId" integer,
	"entryId" text NOT NULL,
	"change" text NOT NULL,
	"previousSnapshotHash" text,
	"previousGameVersion" "GameVersion",
	"previousWorld" text,
	"previousStatRaw" text,
	"previousStatsSnapshot" jsonb,
	"appliedSnapshotHash" text,
	"appliedGameVersion" "GameVersion",
	"appliedAt" timestamp(3) NOT NULL,
	"restoredAt" timestamp(3),
	"restoreOutcome" text,
	CONSTRAINT "LegacyRepairSnapshot_pkey" PRIMARY KEY("runId","snapshotTable","snapshotId"),
	CONSTRAINT "LegacyRepairSnapshot_snapshotTable_check" CHECK ("snapshotTable" in ('NpcSnapshot', 'ItemSnapshot')),
	CONSTRAINT "LegacyRepairSnapshot_change_check" CHECK ("change" in ('promote', 'retire'))
);
--> statement-breakpoint
CREATE INDEX "LegacyRepairSnapshot_runId_entryId_idx" ON "LegacyRepairSnapshot" ("runId","entryId");--> statement-breakpoint
ALTER TABLE "LegacyRepairSnapshot" ADD CONSTRAINT "LegacyRepairSnapshot_runId_entryId_fkey" FOREIGN KEY ("runId","entryId") REFERENCES "LegacyRepairEntry"("runId","entryId");