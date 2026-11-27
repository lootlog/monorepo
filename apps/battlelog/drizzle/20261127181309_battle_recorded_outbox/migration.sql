CREATE TABLE "battle_recorded_outbox" (
	"id" serial PRIMARY KEY,
	"event" jsonb NOT NULL,
	"lastAttemptAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "battle_recorded_outbox_lastAttemptAt_id_idx" ON "battle_recorded_outbox" ("lastAttemptAt" NULLS FIRST,"id");