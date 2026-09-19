CREATE TABLE IF NOT EXISTS "UserOnlineInterval" (
  "userId" text NOT NULL,
  "sessionId" text NOT NULL,
  "segmentId" text NOT NULL,
  "startedAt" timestamptz NOT NULL,
  "endedAt" timestamptz NOT NULL,
  "observedAt" timestamptz NOT NULL,
  PRIMARY KEY ("userId", "sessionId", "segmentId"),
  CHECK ("endedAt" >= "startedAt" AND "observedAt" >= "endedAt")
);
CREATE INDEX IF NOT EXISTS "UserOnlineInterval_userId_endedAt_idx" ON "UserOnlineInterval" ("userId", "endedAt");
CREATE INDEX IF NOT EXISTS "UserOnlineInterval_endedAt_idx" ON "UserOnlineInterval" ("endedAt");
CREATE TABLE IF NOT EXISTS "UserOnlineTracking" (
  "userId" text PRIMARY KEY,
  "lastObservedAt" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS "UserOnlineCollector" (
  "id" integer PRIMARY KEY CHECK ("id" = 1),
  "trackingStartedAt" timestamptz,
  "observedAt" timestamptz NOT NULL,
  "status" text NOT NULL CHECK ("status" IN ('healthy', 'degraded'))
);

-- Idempotent upgrade for databases initialized before multi-gateway health leases.
ALTER TABLE "UserOnlineCollector" ADD COLUMN IF NOT EXISTS "degradedUntil" timestamptz;
UPDATE "UserOnlineCollector" SET "degradedUntil" = "observedAt" + interval '180 seconds'
WHERE status = 'degraded' AND "degradedUntil" IS NULL;
