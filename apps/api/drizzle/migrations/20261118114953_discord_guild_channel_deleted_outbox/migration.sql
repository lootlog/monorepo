CREATE TABLE "DiscordGuildChannelDeletedOutbox" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"channelId" text NOT NULL,
	"syncState" jsonb NOT NULL,
	"lastAttemptAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "DiscordGuildChannelDeletedOutbox_lastAttemptAt_id_idx" ON "DiscordGuildChannelDeletedOutbox" ("lastAttemptAt" NULLS FIRST,"id");--> statement-breakpoint
ALTER TABLE "DiscordGuildChannelDeletedOutbox" ADD CONSTRAINT "DiscordGuildChannelDeletedOutbox_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;