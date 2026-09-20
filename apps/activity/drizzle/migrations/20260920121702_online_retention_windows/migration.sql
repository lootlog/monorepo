CREATE TABLE "UserOnlineRetention" (
	"id" integer PRIMARY KEY,
	"windowStart" timestamp with time zone NOT NULL,
	"cutoff" timestamp with time zone NOT NULL,
	"completed" boolean NOT NULL,
	CONSTRAINT "UserOnlineRetention_id_check" CHECK ("id" = 1)
);
--> statement-breakpoint
CREATE INDEX "UserOnlineInterval_startedAt_idx" ON "UserOnlineInterval" ("startedAt");