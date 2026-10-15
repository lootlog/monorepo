CREATE TABLE "UserTheme" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"definition" jsonb NOT NULL,
	"shareToken" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "UserTheme_userId_createdAt_idx" ON "UserTheme" ("userId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "UserTheme_shareToken_key" ON "UserTheme" ("shareToken");