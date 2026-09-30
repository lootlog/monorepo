-- LOO-38: retained audit log for the legacy NPC/item association repair and
-- the unresolved state of saved notification selections. Only new, empty
-- tables are created; no existing row, link or rule filter changes here. The
-- repair itself runs as a separate, resumable command (see README).
CREATE TABLE "NotificationRuleUnresolvedSelection" (
	"id" serial PRIMARY KEY,
	"ruleId" integer NOT NULL,
	"kind" text NOT NULL,
	"selectedId" integer NOT NULL,
	"selectedName" text,
	"reason" text NOT NULL,
	"suggestedId" integer,
	"suggestedName" text,
	"repairRunId" text,
	"repairEntryId" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "NotificationRuleUnresolvedSelection_kind_check" CHECK ("kind" in ('npc', 'item'))
);
--> statement-breakpoint
CREATE TABLE "LegacyRepairEntry" (
	"runId" text,
	"entryId" text,
	"domain" text NOT NULL,
	"action" text NOT NULL,
	"classification" text NOT NULL,
	"unresolvedReason" text,
	"rowTable" text,
	"sourceSnapshotId" integer,
	"targetSnapshotId" integer,
	"targetCreated" boolean DEFAULT false NOT NULL,
	"rowCount" integer NOT NULL,
	"rowIdsSha256" text,
	"status" text NOT NULL,
	"cursorRowId" integer,
	"appliedRows" integer DEFAULT 0 NOT NULL,
	"alreadyOnTargetRows" integer DEFAULT 0 NOT NULL,
	"skippedRows" integer DEFAULT 0 NOT NULL,
	"restoredRows" integer DEFAULT 0 NOT NULL,
	"keptRows" integer DEFAULT 0 NOT NULL,
	"appliedAt" timestamp(3),
	"rolledBackAt" timestamp(3),
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "LegacyRepairEntry_pkey" PRIMARY KEY("runId","entryId"),
	CONSTRAINT "LegacyRepairEntry_status_check" CHECK ("status" in ('pending', 'applied', 'recorded', 'deferred', 'rolledBack'))
);
--> statement-breakpoint
CREATE TABLE "LegacyRepairLink" (
	"runId" text,
	"rowTable" text,
	"rowId" integer,
	"entryId" text NOT NULL,
	"fromSnapshotId" integer NOT NULL,
	"toSnapshotId" integer NOT NULL,
	"appliedAt" timestamp(3) NOT NULL,
	"restoredAt" timestamp(3),
	"restoreOutcome" text,
	CONSTRAINT "LegacyRepairLink_pkey" PRIMARY KEY("runId","rowTable","rowId"),
	CONSTRAINT "LegacyRepairLink_rowTable_check" CHECK ("rowTable" in ('LootNpc', 'LootItem'))
);
--> statement-breakpoint
CREATE TABLE "LegacyRepairRun" (
	"runId" text PRIMARY KEY,
	"manifestVersion" integer NOT NULL,
	"manifestSha256" text NOT NULL,
	"entryCount" integer NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"appliedAt" timestamp(3),
	"rolledBackAt" timestamp(3),
	CONSTRAINT "LegacyRepairRun_status_check" CHECK ("status" in ('applying', 'applied', 'rollingBack', 'rolledBack'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "NotificationRuleUnresolvedSelection_ruleId_kind_selectedId_key" ON "NotificationRuleUnresolvedSelection" ("ruleId","kind","selectedId");--> statement-breakpoint
CREATE INDEX "LegacyRepairEntry_runId_status_idx" ON "LegacyRepairEntry" ("runId","status");--> statement-breakpoint
CREATE INDEX "LegacyRepairLink_runId_entryId_rowId_idx" ON "LegacyRepairLink" ("runId","entryId","rowId");--> statement-breakpoint
ALTER TABLE "NotificationRuleUnresolvedSelection" ADD CONSTRAINT "NotificationRuleUnresolvedSelection_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "LegacyRepairEntry" ADD CONSTRAINT "LegacyRepairEntry_runId_LegacyRepairRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "LegacyRepairRun"("runId");--> statement-breakpoint
ALTER TABLE "LegacyRepairLink" ADD CONSTRAINT "LegacyRepairLink_runId_entryId_fkey" FOREIGN KEY ("runId","entryId") REFERENCES "LegacyRepairEntry"("runId","entryId");