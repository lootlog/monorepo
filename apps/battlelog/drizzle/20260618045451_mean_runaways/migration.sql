ALTER TABLE "battle_warriors" ADD COLUMN "stats" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "battle_warriors" ADD COLUMN "statsVersion" integer DEFAULT 1 NOT NULL;