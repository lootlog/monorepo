-- Drops the kill statistics tables that 20261003233734_kill_bucket_hypertables
-- replaced. Deploy the API without their account deletion deletes first; see
-- drizzle/README.md. Dropping their foreign keys locks "Guild" and "Member", so
-- the migration gives up instead of queueing their readers behind it.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
-- The reconcile migration copies old buckets into the new tables. Running it
-- in this transaction means it ran after the API stopped deleting old rows, so
-- it restored the kills of accounts deleted in between. The migrator records
-- every migration of a run with the same now().
DO $$
BEGIN
  IF EXISTS (SELECT FROM "UserKillStatsBucket")
    OR EXISTS (SELECT FROM "NpcKillStatsBucket")
    OR EXISTS (SELECT FROM "GuildKillSummaryBucket") THEN
    IF EXISTS (
      SELECT FROM drizzle."__drizzle_migrations"
      WHERE "name" = '20261004005422_kill_bucket_reconcile' AND "applied_at" = now()
    ) THEN
      RAISE EXCEPTION 'Apply 20261004005422_kill_bucket_reconcile before deploying the API without the old kill table deletes (see apps/api/drizzle/README.md)';
    END IF;
  END IF;
END $$;--> statement-breakpoint
DROP TABLE "GuildKillSummaryBucket";--> statement-breakpoint
DROP TABLE "GuildKillSummary";--> statement-breakpoint
DROP TABLE "NpcKillStatsBucket";--> statement-breakpoint
DROP TABLE "NpcKillStats";--> statement-breakpoint
DROP TABLE "UserKillStatsBucket";--> statement-breakpoint
DROP TABLE "UserKillStats";--> statement-breakpoint
DROP TABLE "KillBucketCutover";
