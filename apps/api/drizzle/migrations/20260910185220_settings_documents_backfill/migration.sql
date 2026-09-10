-- Backfill legacy UserGameAccountSettings rows into UserSettingDocument.
-- Idempotent: existing documents win (ON CONFLICT DO NOTHING). The legacy table
-- is left untouched so an older API revision can still read it during rollback.

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
ON CONFLICT ("userId", "domain", "scopeType", "scopeId") DO NOTHING;
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
ON CONFLICT ("userId", "domain", "scopeType", "scopeId") DO NOTHING;
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
ON CONFLICT ("userId", "domain", "scopeType", "scopeId") DO NOTHING;
