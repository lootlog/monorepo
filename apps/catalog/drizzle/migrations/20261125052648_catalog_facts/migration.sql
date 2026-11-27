CREATE TABLE "CatalogFactObservation" (
	"factId" uuid,
	"submissionId" uuid,
	CONSTRAINT "CatalogFactObservation_pkey" PRIMARY KEY("factId","submissionId")
);
--> statement-breakpoint
CREATE TABLE "CatalogFactSubmission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submissionKey" text NOT NULL UNIQUE,
	"source" text NOT NULL,
	"contributorUserId" text NOT NULL,
	"gameVersion" text NOT NULL,
	"world" text NOT NULL,
	"extractorVersion" integer NOT NULL,
	"factCount" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CatalogFact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"gameVersion" text NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"contentHash" text NOT NULL,
	"document" jsonb NOT NULL,
	"firstObservedAt" timestamp with time zone NOT NULL,
	"lastObservedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "CatalogFactObservation_submissionId_idx" ON "CatalogFactObservation" ("submissionId");--> statement-breakpoint
CREATE UNIQUE INDEX "CatalogFact_variant_key" ON "CatalogFact" ("gameVersion","kind","subject","contentHash");--> statement-breakpoint
CREATE INDEX "CatalogFact_subject_lastObservedAt_idx" ON "CatalogFact" ("gameVersion","kind","subject","lastObservedAt");--> statement-breakpoint
ALTER TABLE "CatalogFactObservation" ADD CONSTRAINT "CatalogFactObservation_factId_CatalogFact_id_fkey" FOREIGN KEY ("factId") REFERENCES "CatalogFact"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "CatalogFactObservation" ADD CONSTRAINT "CatalogFactObservation_Hc84Y8iPpQun_fkey" FOREIGN KEY ("submissionId") REFERENCES "CatalogFactSubmission"("id") ON DELETE CASCADE;