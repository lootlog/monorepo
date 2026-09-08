CREATE TYPE "GroupFightOutcome" AS ENUM('TEAM_WON', 'NO_WINNER');--> statement-breakpoint
CREATE TYPE "GroupFightParticipantResult" AS ENUM('WIN', 'LOSS', 'DRAW', 'FLEE');--> statement-breakpoint
CREATE TYPE "GroupFightQualificationSource" AS ENUM('CATALOG', 'NPC_OBSERVED');--> statement-breakpoint
ALTER TYPE "Permission" ADD VALUE 'LOOTLOG_GROUP_FIGHTS_READ';--> statement-breakpoint
ALTER TYPE "Permission" ADD VALUE 'LOOTLOG_GROUP_FIGHTS_WRITE';--> statement-breakpoint
CREATE TABLE "GroupFightParticipant" (
	"id" serial PRIMARY KEY,
	"groupFightId" integer NOT NULL,
	"characterId" text NOT NULL,
	"accountId" text,
	"name" text NOT NULL,
	"prof" text NOT NULL,
	"lvl" integer NOT NULL,
	"icon" text NOT NULL,
	"team" integer NOT NULL,
	"result" "GroupFightParticipantResult" NOT NULL,
	"fled" boolean DEFAULT false NOT NULL,
	"joinedAt" timestamp(3) NOT NULL,
	"participationSeconds" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GroupFightSubmission" (
	"id" serial PRIMARY KEY,
	"groupFightId" integer NOT NULL,
	"guildId" text NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"characterId" text NOT NULL,
	"team" integer NOT NULL,
	"battleId" text,
	"submissionKey" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GroupFight" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"world" text NOT NULL,
	"fightKey" text NOT NULL,
	"mapId" integer,
	"mapName" text NOT NULL,
	"qualificationSource" "GroupFightQualificationSource" NOT NULL,
	"qualifyingNpcName" text,
	"startedAt" timestamp(3) NOT NULL,
	"endedAt" timestamp(3) NOT NULL,
	"durationSeconds" integer NOT NULL,
	"teamOneSize" integer NOT NULL,
	"teamTwoSize" integer NOT NULL,
	"outcome" "GroupFightOutcome" NOT NULL,
	"winningTeam" integer,
	"effectiveWinningTeam" integer,
	"ourTeam" integer NOT NULL,
	"hasFlee" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Guild" ADD COLUMN "groupFightsEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Guild" ADD COLUMN "groupFightsIncludeIncomplete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "GroupFightParticipant_groupFightId_characterId_key" ON "GroupFightParticipant" ("groupFightId","characterId");--> statement-breakpoint
CREATE INDEX "GroupFightParticipant_accountId_characterId_idx" ON "GroupFightParticipant" ("accountId","characterId");--> statement-breakpoint
CREATE INDEX "GroupFightParticipant_characterId_idx" ON "GroupFightParticipant" ("characterId");--> statement-breakpoint
CREATE UNIQUE INDEX "GroupFightSubmission_guildId_submissionKey_key" ON "GroupFightSubmission" ("guildId","submissionKey");--> statement-breakpoint
CREATE INDEX "GroupFightSubmission_groupFightId_idx" ON "GroupFightSubmission" ("groupFightId");--> statement-breakpoint
CREATE INDEX "GroupFightSubmission_userId_idx" ON "GroupFightSubmission" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "GroupFight_guildId_fightKey_key" ON "GroupFight" ("guildId","fightKey");--> statement-breakpoint
CREATE INDEX "GroupFight_guildId_endedAt_idx" ON "GroupFight" ("guildId","endedAt");--> statement-breakpoint
CREATE INDEX "GroupFight_guildId_world_endedAt_idx" ON "GroupFight" ("guildId","world","endedAt");--> statement-breakpoint
ALTER TABLE "GroupFightParticipant" ADD CONSTRAINT "GroupFightParticipant_groupFightId_GroupFight_id_fkey" FOREIGN KEY ("groupFightId") REFERENCES "GroupFight"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "GroupFightSubmission" ADD CONSTRAINT "GroupFightSubmission_groupFightId_GroupFight_id_fkey" FOREIGN KEY ("groupFightId") REFERENCES "GroupFight"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "GroupFight" ADD CONSTRAINT "GroupFight_guildId_Guild_id_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE;