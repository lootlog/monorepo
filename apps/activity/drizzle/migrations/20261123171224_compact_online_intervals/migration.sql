-- Rebuilds the table instead of altering it in place: an in-place type change
-- keeps the dropped "segmentId" bytes until the next rewrite. The gateway
-- builds every segment id as "<sessionId>:<segment start in ms>", so the key
-- keeps the session as a uuid and the segment as its start time. Lua wrote the
-- same start as both "<ms>" and "<ms>.0", so rows of one segment are merged the
-- way the online upsert merges a redelivered checkpoint. Rows are
-- copied in "startedAt" order so the BRIN index stays selective, and the
-- fixed-width columns come first so no row pays alignment padding.
LOCK TABLE "UserOnlineInterval" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
CREATE TABLE "UserOnlineIntervalCompact" (
	"segmentStartedAt" timestamp with time zone NOT NULL,
	"startedAt" timestamp with time zone NOT NULL,
	"endedAt" timestamp with time zone NOT NULL,
	"observedAt" timestamp with time zone NOT NULL,
	"sessionId" uuid NOT NULL,
	"userId" text NOT NULL,
	"world" text,
	CONSTRAINT "UserOnlineInterval_check" CHECK ("endedAt" >= "startedAt" AND "observedAt" >= "endedAt")
) WITH (autovacuum_vacuum_insert_scale_factor = 0.01);--> statement-breakpoint
INSERT INTO "UserOnlineIntervalCompact" ("segmentStartedAt", "startedAt", "endedAt", "observedAt", "sessionId", "userId", "world")
SELECT
	"segmentStartedAt",
	max("startedAt"),
	max("endedAt"),
	max("observedAt"),
	"sessionId"::uuid,
	"userId",
	CASE WHEN count("world") = count(*) AND min("world") = max("world") THEN min("world") END
FROM (
	SELECT
		timestamptz 'epoch' + split_part(substr("segmentId", length("sessionId") + 2), '.', 1)::bigint * interval '1 millisecond' AS "segmentStartedAt",
		"startedAt",
		"endedAt",
		"observedAt",
		"sessionId",
		"userId",
		"world"
	FROM "UserOnlineInterval"
) AS "segments"
GROUP BY "userId", "sessionId", "segmentStartedAt"
ORDER BY max("startedAt");--> statement-breakpoint
DROP TABLE "UserOnlineInterval";--> statement-breakpoint
ALTER TABLE "UserOnlineIntervalCompact" RENAME TO "UserOnlineInterval";--> statement-breakpoint
ALTER TABLE "UserOnlineInterval" ADD CONSTRAINT "UserOnlineInterval_pkey" PRIMARY KEY ("userId","sessionId","segmentStartedAt");--> statement-breakpoint
CREATE INDEX "UserOnlineInterval_startedAt_idx" ON "UserOnlineInterval" USING brin ("startedAt");--> statement-breakpoint
ANALYZE "UserOnlineInterval";
