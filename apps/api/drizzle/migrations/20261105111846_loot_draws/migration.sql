CREATE TABLE "LootDraw" (
	"id" serial PRIMARY KEY,
	"organizationLootRecordId" integer NOT NULL,
	"itemHid" text NOT NULL,
	"entrants" jsonb NOT NULL,
	"roll" integer NOT NULL,
	"winnerIndex" integer NOT NULL,
	"createdByMemberId" integer NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"voidedAt" timestamp(3),
	"voidedByMemberId" integer,
	"voidReason" text,
	CONSTRAINT "LootDraw_void_complete" CHECK (("voidedAt" IS NULL) = ("voidedByMemberId" IS NULL) AND ("voidedAt" IS NULL) = ("voidReason" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "LootMapPlayer" ADD COLUMN "lvl" integer;--> statement-breakpoint
CREATE INDEX "LootDraw_organizationLootRecordId_createdAt_idx" ON "LootDraw" ("organizationLootRecordId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "LootDraw_organizationLootRecordId_itemHid_active_key" ON "LootDraw" ("organizationLootRecordId","itemHid") WHERE "voidedAt" IS NULL;--> statement-breakpoint
ALTER TABLE "LootDraw" ADD CONSTRAINT "LootDraw_organizationLootRecordId_fkey" FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "LootDraw" ADD CONSTRAINT "LootDraw_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "LootDraw" ADD CONSTRAINT "LootDraw_voidedByMemberId_fkey" FOREIGN KEY ("voidedByMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;