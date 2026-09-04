CREATE TABLE "battle_object_deletions" (
	"battleId" text PRIMARY KEY,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"retryAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "battle_object_deletions_retryAt_idx" ON "battle_object_deletions" ("retryAt");