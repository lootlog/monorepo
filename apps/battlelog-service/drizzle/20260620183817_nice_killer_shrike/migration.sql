ALTER TABLE "battles" ADD COLUMN "submissionId" text;--> statement-breakpoint
CREATE UNIQUE INDEX "battles_submissionId_key" ON "battles" ("submissionId");