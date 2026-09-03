ALTER TABLE "battles" ADD COLUMN "semanticFingerprint" text;--> statement-breakpoint
CREATE INDEX "battles_semanticFingerprint_createdAt_idx" ON "battles" ("semanticFingerprint","createdAt");