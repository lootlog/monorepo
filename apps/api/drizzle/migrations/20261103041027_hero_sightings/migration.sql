CREATE TYPE "HeroSightingCloseReason" AS ENUM('KILLED', 'PROBABLY_KILLED');--> statement-breakpoint
CREATE TYPE "HeroSightingState" AS ENUM('ROAMING', 'SPAWNING');--> statement-breakpoint
ALTER TYPE "NotificationTriggerType" ADD VALUE 'HERO_SIGHTED';--> statement-breakpoint
CREATE TABLE "HeroSightingClaim" (
	"sightingId" integer,
	"memberId" integer,
	"characterSnapshotId" integer,
	"characterLvl" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "HeroSightingClaim_pkey" PRIMARY KEY("sightingId","memberId")
);
--> statement-breakpoint
CREATE TABLE "HeroSighting" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"world" text NOT NULL,
	"heroKey" text NOT NULL,
	"heroName" text NOT NULL,
	"heroLvl" integer NOT NULL,
	"heroProf" "Profession",
	"state" "HeroSightingState" NOT NULL,
	"mapName" text NOT NULL,
	"firstSeenAt" timestamp(3) NOT NULL,
	"lastSeenAt" timestamp(3) NOT NULL,
	"spawnedAt" timestamp(3),
	"detectedById" integer NOT NULL,
	"detectorCharacterSnapshotId" integer,
	"detectorCharacterLvl" integer,
	"lastSeenById" integer NOT NULL,
	"closedAt" timestamp(3),
	"closeReason" "HeroSightingCloseReason",
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "HeroSighting_closed_check" CHECK (("closedAt" IS NULL) = ("closeReason" IS NULL))
);
--> statement-breakpoint
CREATE INDEX "HeroSightingClaim_memberId_idx" ON "HeroSightingClaim" ("memberId");--> statement-breakpoint
CREATE INDEX "HeroSightingClaim_characterSnapshotId_idx" ON "HeroSightingClaim" ("characterSnapshotId");--> statement-breakpoint
CREATE UNIQUE INDEX "HeroSighting_open_guildId_world_heroKey_key" ON "HeroSighting" ("guildId","world","heroKey") WHERE "closedAt" IS NULL;--> statement-breakpoint
CREATE INDEX "HeroSighting_guildId_world_heroKey_id_idx" ON "HeroSighting" ("guildId","world","heroKey","id");--> statement-breakpoint
CREATE INDEX "HeroSighting_guildId_world_lastSeenAt_idx" ON "HeroSighting" ("guildId","world","lastSeenAt");--> statement-breakpoint
CREATE INDEX "HeroSighting_detectedById_idx" ON "HeroSighting" ("detectedById");--> statement-breakpoint
CREATE INDEX "HeroSighting_lastSeenById_idx" ON "HeroSighting" ("lastSeenById");--> statement-breakpoint
CREATE INDEX "HeroSighting_detectorCharacterSnapshotId_idx" ON "HeroSighting" ("detectorCharacterSnapshotId");--> statement-breakpoint
ALTER TABLE "HeroSightingClaim" ADD CONSTRAINT "HeroSightingClaim_sightingId_fkey" FOREIGN KEY ("sightingId") REFERENCES "HeroSighting"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "HeroSightingClaim" ADD CONSTRAINT "HeroSightingClaim_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "HeroSightingClaim" ADD CONSTRAINT "HeroSightingClaim_characterSnapshotId_fkey" FOREIGN KEY ("characterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "HeroSighting" ADD CONSTRAINT "HeroSighting_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "HeroSighting" ADD CONSTRAINT "HeroSighting_detectedById_fkey" FOREIGN KEY ("detectedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "HeroSighting" ADD CONSTRAINT "HeroSighting_lastSeenById_fkey" FOREIGN KEY ("lastSeenById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "HeroSighting" ADD CONSTRAINT "HeroSighting_detectorCharacterSnapshotId_fkey" FOREIGN KEY ("detectorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;