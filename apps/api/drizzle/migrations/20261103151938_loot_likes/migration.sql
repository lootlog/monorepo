CREATE TABLE "LootLike" (
	"organizationLootRecordId" integer,
	"memberId" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "LootLike_pkey" PRIMARY KEY("organizationLootRecordId","memberId")
);
--> statement-breakpoint
CREATE INDEX "LootLike_memberId_idx" ON "LootLike" ("memberId");--> statement-breakpoint
ALTER TABLE "LootLike" ADD CONSTRAINT "LootLike_organizationLootRecordId_fkey" FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "LootLike" ADD CONSTRAINT "LootLike_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;