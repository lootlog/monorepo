CREATE TABLE "EventHeroCheckOutbox" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"jobId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"lastAttemptAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "EventHeroCheckOutbox_lastAttemptAt_id_idx" ON "EventHeroCheckOutbox" ("lastAttemptAt" NULLS FIRST,"id");--> statement-breakpoint
ALTER TABLE "EventHeroCheckOutbox" ADD CONSTRAINT "EventHeroCheckOutbox_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;