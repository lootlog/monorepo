ALTER TYPE "NotificationTriggerType" ADD VALUE 'FACTION_WAR';--> statement-breakpoint
CREATE TABLE "FactionWarAward" (
	"warId" text,
	"source" text,
	"sourceKey" text,
	"userId" text,
	"awardedAt" timestamp(3) NOT NULL,
	CONSTRAINT "FactionWarAward_pkey" PRIMARY KEY("warId","source","sourceKey","userId")
);
--> statement-breakpoint
CREATE TABLE "FactionWarCursor" (
	"warId" text PRIMARY KEY,
	"pvpBattleId" text NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FactionWarDailyPoints" (
	"warId" text,
	"userId" text,
	"day" text,
	"source" text,
	"points" integer NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "FactionWarDailyPoints_pkey" PRIMARY KEY("warId","userId","day","source")
);
--> statement-breakpoint
CREATE TABLE "FactionWarOnlineSegment" (
	"warId" text,
	"userId" text,
	"sessionId" text,
	"segmentId" text,
	"startedAt" timestamp(3) with time zone NOT NULL,
	"endedAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "FactionWarOnlineSegment_pkey" PRIMARY KEY("warId","userId","sessionId","segmentId")
);
--> statement-breakpoint
CREATE TABLE "FactionWarPickLock" (
	"warId" text,
	"discordIdHash" text,
	CONSTRAINT "FactionWarPickLock_pkey" PRIMARY KEY("warId","discordIdHash")
);
--> statement-breakpoint
CREATE TABLE "FactionWarPick" (
	"warId" text,
	"userId" text,
	"discordId" text NOT NULL,
	"faction" text NOT NULL,
	"characterId" text NOT NULL,
	"characterName" text NOT NULL,
	"world" text NOT NULL,
	"hiddenFromLeaderboard" boolean DEFAULT false NOT NULL,
	"championHighlightHidden" boolean DEFAULT false NOT NULL,
	"pickedAt" timestamp(3) NOT NULL,
	"disqualifiedAt" timestamp(3),
	"disqualificationReason" text,
	CONSTRAINT "FactionWarPick_pkey" PRIMARY KEY("warId","userId")
);
--> statement-breakpoint
CREATE INDEX "FactionWarDailyPoints_warId_day_idx" ON "FactionWarDailyPoints" ("warId","day");--> statement-breakpoint
CREATE INDEX "FactionWarPick_warId_faction_idx" ON "FactionWarPick" ("warId","faction");--> statement-breakpoint
CREATE UNIQUE INDEX "FactionWarPick_warId_discordId_key" ON "FactionWarPick" ("warId","discordId");