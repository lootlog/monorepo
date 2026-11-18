ALTER TYPE "HeroSightingCloseReason" ADD VALUE 'WITHDRAWN';--> statement-breakpoint
ALTER TABLE "HeroSighting" ADD COLUMN "manual" boolean DEFAULT false NOT NULL;