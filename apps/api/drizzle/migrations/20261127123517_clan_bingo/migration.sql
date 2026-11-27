CREATE TYPE "BingoBoardMode" AS ENUM('RACE', 'LOCKOUT');--> statement-breakpoint
CREATE TYPE "BingoBoardStatus" AS ENUM('DRAFT', 'ACTIVE', 'FINISHED');--> statement-breakpoint
CREATE TYPE "BingoTileConditionKind" AS ENUM('LOOT', 'KILL', 'HERO_SIGHTING', 'BATTLE', 'MANUAL');--> statement-breakpoint
ALTER TYPE "NotificationTriggerType" ADD VALUE 'BINGO_MILESTONE';--> statement-breakpoint
CREATE TABLE "BingoBoard" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"world" text,
	"mode" "BingoBoardMode" DEFAULT 'RACE'::"BingoBoardMode" NOT NULL,
	"status" "BingoBoardStatus" DEFAULT 'DRAFT'::"BingoBoardStatus" NOT NULL,
	"pointsPerTile" integer DEFAULT 1 NOT NULL,
	"pointsPerLine" integer DEFAULT 5 NOT NULL,
	"firstCompleterBonus" integer DEFAULT 0 NOT NULL,
	"blackoutBonus" integer DEFAULT 10 NOT NULL,
	"startsAt" timestamp(3),
	"endsAt" timestamp(3),
	"createdByMemberId" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BingoProgressEvent" (
	"id" text PRIMARY KEY,
	"boardId" text NOT NULL,
	"tileId" text NOT NULL,
	"memberId" integer NOT NULL,
	"sourceKind" "BingoTileConditionKind" NOT NULL,
	"dedupKey" text NOT NULL,
	"delta" integer NOT NULL,
	"previousCount" integer NOT NULL,
	"newCount" integer NOT NULL,
	"completedTile" boolean DEFAULT false NOT NULL,
	"completedLineCount" integer DEFAULT 0 NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"occurredAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BingoTileProgress" (
	"id" serial PRIMARY KEY,
	"boardId" text NOT NULL,
	"tileId" text NOT NULL,
	"memberId" integer NOT NULL,
	"currentCount" integer DEFAULT 0 NOT NULL,
	"targetCount" integer NOT NULL,
	"completedAt" timestamp(3),
	"manualOverride" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BingoTile" (
	"id" text PRIMARY KEY,
	"boardId" text NOT NULL,
	"row" smallint NOT NULL,
	"col" smallint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"points" integer,
	"conditionKind" "BingoTileConditionKind" NOT NULL,
	"condition" jsonb NOT NULL,
	"lockedByMemberId" integer,
	"lockedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "BingoTile_row_col_bounds_check" CHECK ("row" >= 0 AND "row" < 5 AND "col" >= 0 AND "col" < 5)
);
--> statement-breakpoint
CREATE INDEX "BingoBoard_guildId_status_updatedAt_idx" ON "BingoBoard" ("guildId","status","updatedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "BingoBoard_status_world_idx" ON "BingoBoard" ("status","world");--> statement-breakpoint
CREATE UNIQUE INDEX "BingoProgressEvent_tileId_memberId_dedupKey_key" ON "BingoProgressEvent" ("tileId","memberId","dedupKey");--> statement-breakpoint
CREATE INDEX "BingoProgressEvent_boardId_createdAt_idx" ON "BingoProgressEvent" ("boardId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "BingoTileProgress_tileId_memberId_key" ON "BingoTileProgress" ("tileId","memberId");--> statement-breakpoint
CREATE INDEX "BingoTileProgress_boardId_memberId_idx" ON "BingoTileProgress" ("boardId","memberId");--> statement-breakpoint
CREATE UNIQUE INDEX "BingoTile_boardId_row_col_key" ON "BingoTile" ("boardId","row","col");--> statement-breakpoint
CREATE INDEX "BingoTile_boardId_conditionKind_idx" ON "BingoTile" ("boardId","conditionKind");--> statement-breakpoint
ALTER TABLE "BingoBoard" ADD CONSTRAINT "BingoBoard_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoBoard" ADD CONSTRAINT "BingoBoard_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoProgressEvent" ADD CONSTRAINT "BingoProgressEvent_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "BingoBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoProgressEvent" ADD CONSTRAINT "BingoProgressEvent_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "BingoTile"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoProgressEvent" ADD CONSTRAINT "BingoProgressEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoTileProgress" ADD CONSTRAINT "BingoTileProgress_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "BingoBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoTileProgress" ADD CONSTRAINT "BingoTileProgress_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "BingoTile"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoTileProgress" ADD CONSTRAINT "BingoTileProgress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoTile" ADD CONSTRAINT "BingoTile_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "BingoBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoTile" ADD CONSTRAINT "BingoTile_lockedByMemberId_fkey" FOREIGN KEY ("lockedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;