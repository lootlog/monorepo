CREATE TABLE "CatalogReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subjectType" text NOT NULL,
	"gameVersion" text NOT NULL,
	"subjectId" integer NOT NULL,
	"reason" text NOT NULL,
	"comment" text,
	"reporterUserId" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"reviewedByUserId" text,
	"reviewedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "CatalogReport_open_reporter_subject_key" ON "CatalogReport" ("reporterUserId","subjectType","gameVersion","subjectId") WHERE "status" = 'OPEN';--> statement-breakpoint
CREATE INDEX "CatalogReport_status_subject_idx" ON "CatalogReport" ("status","subjectType","gameVersion","subjectId");--> statement-breakpoint
CREATE INDEX "CatalogReport_reporter_createdAt_idx" ON "CatalogReport" ("reporterUserId","createdAt");