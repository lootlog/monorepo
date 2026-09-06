-- Explicit reduction to sixteen weeks. CURRENT_TIMESTAMP is fixed for the transaction.
BEGIN;
DELETE FROM "UserOnlineInterval"
WHERE "endedAt" <= CURRENT_TIMESTAMP - interval '112 days';
UPDATE "UserOnlineInterval"
SET "startedAt" = CURRENT_TIMESTAMP - interval '112 days'
WHERE "startedAt" < CURRENT_TIMESTAMP - interval '112 days';
DELETE FROM "UserOnlineTracking"
WHERE "lastObservedAt" <= CURRENT_TIMESTAMP - interval '112 days';
COMMIT;
