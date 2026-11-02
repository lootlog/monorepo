-- These columns hold the Discord id of the acting User, not a Member id.
ALTER TABLE "GuildDocument" RENAME COLUMN "createdByMemberId" TO "createdByDiscordId";--> statement-breakpoint
ALTER TABLE "GuildDocument" RENAME COLUMN "updatedByMemberId" TO "updatedByDiscordId";--> statement-breakpoint
ALTER TABLE "GuildDocument" RENAME COLUMN "deletedByMemberId" TO "deletedByDiscordId";--> statement-breakpoint
ALTER TABLE "GuildDocumentHistory" RENAME COLUMN "actorMemberId" TO "actorDiscordId";
