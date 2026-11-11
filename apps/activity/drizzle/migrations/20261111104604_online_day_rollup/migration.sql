CREATE TABLE "UserOnlineDay" (
	"userId" text,
	"date" date,
	"world" text,
	"spans" tstzmultirange NOT NULL,
	CONSTRAINT "UserOnlineDay_pkey" PRIMARY KEY("userId","date","world")
);
--> statement-breakpoint
CREATE INDEX "UserOnlineDay_date_idx" ON "UserOnlineDay" ("date");