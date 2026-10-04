-- Drops the kill statistics tables that 20261003233734_kill_bucket_hypertables
-- replaced. Deploy the API without their account deletion deletes first; see
-- drizzle/README.md. Dropping their foreign keys locks "Guild" and "Member", so
-- the migration gives up instead of queueing their readers behind it.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
DROP TABLE "GuildKillSummaryBucket";--> statement-breakpoint
DROP TABLE "GuildKillSummary";--> statement-breakpoint
DROP TABLE "NpcKillStatsBucket";--> statement-breakpoint
DROP TABLE "NpcKillStats";--> statement-breakpoint
DROP TABLE "UserKillStatsBucket";--> statement-breakpoint
DROP TABLE "UserKillStats";--> statement-breakpoint
DROP TABLE "KillBucketCutover";
