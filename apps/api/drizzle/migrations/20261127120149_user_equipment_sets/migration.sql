CREATE TABLE "UserEquipmentSet" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"code" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserEntitlement" ADD COLUMN "equipmentSetLimit" integer;--> statement-breakpoint
CREATE INDEX "UserEquipmentSet_userId_createdAt_idx" ON "UserEquipmentSet" ("userId","createdAt");