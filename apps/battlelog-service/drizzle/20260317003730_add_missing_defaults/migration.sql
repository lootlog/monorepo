ALTER TABLE "battles" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_characters" ALTER COLUMN "updatedAt" SET DEFAULT now();