-- Faction war announcement rules cannot survive the enum without FACTION_WAR;
-- their targets and jobs cascade with them.
DELETE FROM "NotificationJob" WHERE "sourceEntityType" = 'faction-war';--> statement-breakpoint
DELETE FROM "NotificationRule" WHERE "triggerType" = 'FACTION_WAR';--> statement-breakpoint
DROP TABLE "FactionWarAward";--> statement-breakpoint
DROP TABLE "FactionWarCursor";--> statement-breakpoint
DROP TABLE "FactionWarDailyPoints";--> statement-breakpoint
DROP TABLE "FactionWarOnlineSegment";--> statement-breakpoint
DROP TABLE "FactionWarPickLock";--> statement-breakpoint
DROP TABLE "FactionWarPick";--> statement-breakpoint
ALTER TABLE "NotificationRule" ALTER COLUMN "triggerType" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "NotificationTriggerType";--> statement-breakpoint
CREATE TYPE "NotificationTriggerType" AS ENUM('TIMER_BEFORE_SPAWN', 'NPC_SPAWNED', 'WATCHED_ITEM_DROPPED', 'SCHEDULED_MESSAGE');--> statement-breakpoint
ALTER TABLE "NotificationRule" ALTER COLUMN "triggerType" SET DATA TYPE "NotificationTriggerType" USING "triggerType"::"NotificationTriggerType";