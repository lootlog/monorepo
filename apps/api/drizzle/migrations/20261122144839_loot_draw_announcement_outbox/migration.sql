CREATE TABLE "LootDrawAnnouncementOutbox" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"lootId" integer NOT NULL,
	"drawId" integer NOT NULL,
	"outcome" text NOT NULL,
	"lastAttemptAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "LootDrawAnnouncementOutbox_lastAttemptAt_id_idx" ON "LootDrawAnnouncementOutbox" ("lastAttemptAt" NULLS FIRST,"id");--> statement-breakpoint
ALTER TABLE "LootDrawAnnouncementOutbox" ADD CONSTRAINT "LootDrawAnnouncementOutbox_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;