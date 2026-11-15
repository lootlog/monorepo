-- Fail instead of queuing activity and checkpoint writers behind a busy table.
-- Locks are taken in the order an activity write takes them ("Activity", then
-- sessions, then stats), so the migration cannot deadlock with one. The
-- migrator rolls everything back together; retry when traffic allows.
SET LOCAL lock_timeout = '2s';--> statement-breakpoint
-- Organization reads filter by "guildId" and page by ("createdAt", id) newest
-- first, so a compressed chunk answers them from one segment in stored order.
ALTER TABLE "Activity" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"guildId"',
  timescaledb.compress_orderby = '"createdAt" DESC, "id" DESC'
);--> statement-breakpoint
DROP INDEX "MemberActivitySession_guildId_discordId_source_idx";--> statement-breakpoint
DROP INDEX "MemberActivitySession_guildId_source_idx";--> statement-breakpoint
DROP INDEX "MemberActivitySession_lastSeenAt_idx";--> statement-breakpoint
-- Both tables take an in-place update on every event and index none of the
-- updated columns. Free space on each page keeps those updates heap-only; the
-- rewrite returns the pages that earlier bloat left behind and applies the new
-- fill factor. Each holds ACCESS EXCLUSIVE on a table of at most a few hundred
-- megabytes until the migration commits.
ALTER TABLE "MemberActivityStats" SET (fillfactor = 70);--> statement-breakpoint
CLUSTER "MemberActivityStats" USING "MemberActivityStats_pkey";--> statement-breakpoint
ALTER TABLE "UserOnlineTracking" SET (fillfactor = 50);--> statement-breakpoint
CLUSTER "UserOnlineTracking" USING "UserOnlineTracking_pkey";--> statement-breakpoint
SET LOCAL lock_timeout = DEFAULT;--> statement-breakpoint
-- Writes always land in the newest chunk. Leaving the previous day uncompressed
-- keeps the idempotency pre-check of a delayed or redelivered event on B-tree
-- indexes.
SELECT add_compression_policy('"Activity"', compress_after => INTERVAL '1 day', schedule_interval => INTERVAL '1 hour');
