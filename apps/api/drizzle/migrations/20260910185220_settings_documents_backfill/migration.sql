-- Backfill legacy UserGameAccountSettings rows into UserSettingDocument.
-- Idempotent: the newer side wins. A legacy row updated after the existing
-- document replaces the backfilled keys (older dual-written documents stopped
-- receiving writes while the legacy routes kept accepting them); a document
-- updated after the legacy row is kept. Rerunning is a no-op because equal
-- timestamps never satisfy the update predicate. The legacy table is left
-- untouched so an older API revision can still read it during rollback.

INSERT INTO "UserSettingDocument" ("userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "createdAt", "updatedAt")
SELECT
	"userId",
	'gameData',
	'GAME_ACCOUNT',
	"accountId",
	jsonb_strip_nulls(jsonb_build_object(
		'pings', "settings"->'pings',
		'detector', "settings"->'detector',
		'airTags', "settings"->'airTags'
	)),
	1,
	"createdAt",
	"updatedAt"
FROM "UserGameAccountSettings"
WHERE "accountId" <> '__global-notification-mutes__'
	AND jsonb_typeof("settings") = 'object'
	AND ("settings" ? 'pings' OR "settings" ? 'detector' OR "settings" ? 'airTags')
ON CONFLICT ("userId", "domain", "scopeType", "scopeId") DO UPDATE SET
	"overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
	"schemaVersion" = EXCLUDED."schemaVersion",
	"updatedAt" = EXCLUDED."updatedAt"
WHERE EXCLUDED."updatedAt" > "UserSettingDocument"."updatedAt";
--> statement-breakpoint
INSERT INTO "UserSettingDocument" ("userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "createdAt", "updatedAt")
SELECT
	"userId",
	'notifications',
	'GAME_ACCOUNT',
	"accountId",
	jsonb_build_object('presentation', "settings"->'notifications'),
	1,
	"createdAt",
	"updatedAt"
FROM "UserGameAccountSettings"
WHERE "accountId" <> '__global-notification-mutes__'
	AND jsonb_typeof("settings") = 'object'
	AND jsonb_typeof("settings"->'notifications') = 'object'
ON CONFLICT ("userId", "domain", "scopeType", "scopeId") DO UPDATE SET
	"overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
	"schemaVersion" = EXCLUDED."schemaVersion",
	"updatedAt" = EXCLUDED."updatedAt"
WHERE EXCLUDED."updatedAt" > "UserSettingDocument"."updatedAt";
--> statement-breakpoint
INSERT INTO "UserSettingDocument" ("userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "createdAt", "updatedAt")
SELECT
	"userId",
	'notifications',
	'USER',
	"userId",
	jsonb_build_object('mutes', "settings"->'mutes'),
	1,
	"createdAt",
	"updatedAt"
FROM "UserGameAccountSettings"
WHERE "accountId" = '__global-notification-mutes__'
	AND jsonb_typeof("settings"->'mutes') = 'object'
ON CONFLICT ("userId", "domain", "scopeType", "scopeId") DO UPDATE SET
	"overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
	"schemaVersion" = EXCLUDED."schemaVersion",
	"updatedAt" = EXCLUDED."updatedAt"
WHERE EXCLUDED."updatedAt" > "UserSettingDocument"."updatedAt";
