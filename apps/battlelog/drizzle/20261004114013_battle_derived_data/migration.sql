-- Stored timestamps are UTC. Converting them in a UTC session keeps every value
-- and does not rewrite the tables.
SET LOCAL TimeZone = 'UTC';--> statement-breakpoint
DROP INDEX "battle_warriors_originalId_idx";--> statement-breakpoint
DROP INDEX "battle_warriors_name_idx";--> statement-breakpoint
DROP INDEX "battle_warriors_battleId_team_idx";--> statement-breakpoint
DROP INDEX "battle_warriors_battleId_originalId_idx";--> statement-breakpoint
DROP INDEX "battles_id_idx";--> statement-breakpoint
ALTER TABLE "battle_warriors" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "battle_warriors" DROP COLUMN "stats";--> statement-breakpoint
ALTER TABLE "battle_warriors" DROP COLUMN "statsVersion";--> statement-breakpoint
ALTER TABLE "battles" DROP COLUMN "statistics";--> statement-breakpoint
ALTER TABLE "battle_warriors" ADD CONSTRAINT "battle_warriors_pkey" PRIMARY KEY("battleId","originalId");--> statement-breakpoint
ALTER TABLE "battle_object_deletions" ALTER COLUMN "createdAt" SET DATA TYPE timestamp with time zone USING "createdAt"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "battle_object_deletions" ALTER COLUMN "retryAt" SET DATA TYPE timestamp with time zone USING "retryAt"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_characters" ALTER COLUMN "lastSeenAt" SET DATA TYPE timestamp with time zone USING "lastSeenAt"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_characters" ALTER COLUMN "createdAt" SET DATA TYPE timestamp with time zone USING "createdAt"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_characters" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp with time zone USING "updatedAt"::timestamp with time zone;
