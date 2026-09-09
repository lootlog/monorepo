DROP INDEX "battles_submissionId_key";--> statement-breakpoint
CREATE UNIQUE INDEX "battles_userId_submissionId_key" ON "battles" ("userId","submissionId");