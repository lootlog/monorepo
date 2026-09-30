CREATE TYPE "GameVersion" AS ENUM('pl', 'en');--> statement-breakpoint
ALTER TABLE "Loot" ADD COLUMN "gameVersion" "GameVersion";--> statement-breakpoint
ALTER TABLE "NpcSnapshot" ADD COLUMN "gameVersion" "GameVersion";