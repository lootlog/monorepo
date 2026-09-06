CREATE TABLE "LootMapPlayer" (
	"organizationLootRecordId" integer,
	"playerSnapshotId" integer,
	CONSTRAINT "LootMapPlayer_pkey" PRIMARY KEY("organizationLootRecordId","playerSnapshotId")
);
--> statement-breakpoint
CREATE INDEX "LootMapPlayer_playerSnapshotId_idx" ON "LootMapPlayer" ("playerSnapshotId");--> statement-breakpoint
ALTER TABLE "LootMapPlayer" ADD CONSTRAINT "LootMapPlayer_organizationLootRecordId_fkey" FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "LootMapPlayer" ADD CONSTRAINT "LootMapPlayer_playerSnapshotId_fkey" FOREIGN KEY ("playerSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;