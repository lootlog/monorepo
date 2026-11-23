CREATE TYPE "OrganizationOperatorAction" AS ENUM('limits.set', 'vanity-url.clear', 'discord-sync.refresh', 'suspend', 'resume');--> statement-breakpoint
CREATE TABLE "OrganizationOperatorAudit" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"operatorUserId" text NOT NULL,
	"operatorName" text NOT NULL,
	"action" "OrganizationOperatorAction" NOT NULL,
	"details" jsonb,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Guild" ADD COLUMN "suspendedAt" timestamp(3);--> statement-breakpoint
ALTER TABLE "Guild" ADD COLUMN "suspendedReason" text;--> statement-breakpoint
ALTER TABLE "Guild" ADD COLUMN "suspendedBy" text;--> statement-breakpoint
CREATE INDEX "OrganizationOperatorAudit_guildId_createdAt_idx" ON "OrganizationOperatorAudit" ("guildId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "OrganizationOperatorAudit_createdAt_idx" ON "OrganizationOperatorAudit" ("createdAt" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "OrganizationOperatorAudit" ADD CONSTRAINT "OrganizationOperatorAudit_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_suspension_reason_check" CHECK (("suspendedAt" IS NULL) = ("suspendedReason" IS NULL));