CREATE TYPE "Plan" AS ENUM('premium');--> statement-breakpoint
CREATE TABLE "OrganizationEntitlement" (
	"guildId" text PRIMARY KEY,
	"plan" "Plan",
	"planValidUntil" timestamp(3),
	"notificationRuleLimit" integer,
	"documentLimit" integer,
	"updatedByUserId" text,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserEntitlement" (
	"userId" text PRIMARY KEY,
	"plan" "Plan",
	"planValidUntil" timestamp(3),
	"planExpiryAnnouncedAt" timestamp(3),
	"notificationRuleLimit" integer,
	"watchedItemLimit" integer,
	"customThemeLimit" integer,
	"apiKeyLimit" integer,
	"characterAuras" boolean,
	"updatedByUserId" text,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "UserEntitlement_planValidUntil_idx" ON "UserEntitlement" ("planValidUntil");--> statement-breakpoint
ALTER TABLE "OrganizationEntitlement" ADD CONSTRAINT "OrganizationEntitlement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
INSERT INTO "OrganizationEntitlement" ("guildId", "notificationRuleLimit", "documentLimit", "updatedAt")
SELECT "id", NULLIF("notificationRuleLimit", 20), NULLIF("documentLimit", 50), now() AT TIME ZONE 'UTC'
FROM "Guild"
WHERE "notificationRuleLimit" <> 20 OR "documentLimit" <> 50;--> statement-breakpoint
INSERT INTO "UserEntitlement" ("userId", "characterAuras", "updatedByUserId", "updatedAt")
SELECT "userId", true, "grantedByUserId", "grantedAt"
FROM "UserCharacterAuraGrant";
