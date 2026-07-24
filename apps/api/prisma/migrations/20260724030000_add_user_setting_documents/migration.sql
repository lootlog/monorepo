CREATE TYPE "SettingsScopeType" AS ENUM (
  'USER',
  'GAME_ACCOUNT',
  'CHARACTER',
  'GUILD'
);

CREATE TABLE "UserSettingDocument" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "scopeType" "SettingsScopeType" NOT NULL,
  "scopeId" TEXT NOT NULL,
  "overrides" JSONB NOT NULL DEFAULT '{}',
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserSettingDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSettingDocument_userId_domain_scopeType_scopeId_key"
ON "UserSettingDocument"("userId", "domain", "scopeType", "scopeId");

CREATE INDEX "UserSettingDocument_userId_domain_idx"
ON "UserSettingDocument"("userId", "domain");

CREATE INDEX "UserSettingDocument_userId_scopeType_scopeId_idx"
ON "UserSettingDocument"("userId", "scopeType", "scopeId");

INSERT INTO "UserSettingDocument" (
  "userId",
  "domain",
  "scopeType",
  "scopeId",
  "overrides",
  "schemaVersion",
  "updatedAt"
)
SELECT
  "userId",
  'appearance',
  'USER'::"SettingsScopeType",
  "userId",
  jsonb_build_object(
    'theme', "theme",
    'colorMode', "colorMode"
  ),
  1,
  CURRENT_TIMESTAMP
FROM "UserSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId",
  "domain",
  "scopeType",
  "scopeId",
  "overrides",
  "schemaVersion",
  "updatedAt"
)
SELECT
  "userId",
  'general',
  'USER'::"SettingsScopeType",
  "userId",
  jsonb_build_object('guildsOrder', "guildsOrder"),
  1,
  CURRENT_TIMESTAMP
FROM "UserSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'appearance',
  'USER'::"SettingsScopeType",
  "userId",
  jsonb_build_object(
    'timers',
    jsonb_build_object(
      'displayConfig', "displayConfig",
      'customColors', "customColors",
      'timersColors', "timersColors",
      'defaultColorNames', "defaultColorNames",
      'overriddenDefaultColors', "overriddenDefaultColors",
      'hiddenDefaultColors', "hiddenDefaultColors"
    )
  ),
  1,
  "updatedAt"
FROM "UserTimerSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'timers',
  'USER'::"SettingsScopeType",
  "userId",
  jsonb_build_object(
    'generalConfig', "generalConfig",
    'alwaysVisibleExpiredTimers', "alwaysVisibleExpiredTimers",
    'timerFiltersEnabled', "timerFiltersEnabled",
    'colorFiltersEnabled', "colorFiltersEnabled",
    'timersSortOrder', "timersSortOrder",
    'syncEnabled', "syncEnabled"
  ),
  1,
  "updatedAt"
FROM "UserTimerSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'timers',
  'GUILD'::"SettingsScopeType",
  "guildId",
  jsonb_build_object(
    'hiddenTimers', "hiddenTimers",
    'pinnedTimers', "pinnedTimers"
  ),
  1,
  "updatedAt"
FROM "UserGuildTimerSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'sounds',
  'USER'::"SettingsScopeType",
  "userId",
  jsonb_build_object(
    'notificationsVolume', "notificationsVolume",
    'detectorVolume', "detectorVolume",
    'timersVolume', "timersVolume",
    'pingsVolume', "pingsVolume",
    'notificationsConfig', "notificationsConfig",
    'detectorConfig', "detectorConfig",
    'timersConfig', "timersConfig"
  ),
  1,
  "updatedAt"
FROM "UserSoundSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'gameData',
  'GAME_ACCOUNT'::"SettingsScopeType",
  "accountId",
  jsonb_strip_nulls(
    jsonb_build_object(
      'pings', "settings"->'pings',
      'detector', "settings"->'detector',
      'airTags', "settings"->'airTags'
    )
  ),
  1,
  "updatedAt"
FROM "UserGameAccountSettings"
WHERE "accountId" <> '__global-notification-mutes__'
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'notifications',
  'GAME_ACCOUNT'::"SettingsScopeType",
  "accountId",
  jsonb_strip_nulls(
    jsonb_build_object('presentation', "settings"->'notifications')
  ),
  1,
  "updatedAt"
FROM "UserGameAccountSettings"
WHERE "accountId" <> '__global-notification-mutes__'
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'notifications',
  'USER'::"SettingsScopeType",
  "userId",
  jsonb_strip_nulls(jsonb_build_object('mutes', "settings"->'mutes')),
  1,
  "updatedAt"
FROM "UserGameAccountSettings"
WHERE "accountId" = '__global-notification-mutes__'
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'gameData',
  'CHARACTER'::"SettingsScopeType",
  "characterId",
  jsonb_build_object(
    'lootlog',
    jsonb_build_object('catchingGuildIds', "catchingGuildIds")
  ),
  1,
  "updatedAt"
FROM "UserCharactersLootlogSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");

INSERT INTO "UserSettingDocument" (
  "userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt"
)
SELECT
  "userId",
  'events',
  'GUILD'::"SettingsScopeType",
  "guildId",
  jsonb_build_object('pinnedEvents', "pinnedEvents"),
  1,
  "updatedAt"
FROM "UserGuildEventSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId")
DO UPDATE SET
  "overrides" = "UserSettingDocument"."overrides" || EXCLUDED."overrides",
  "schemaVersion" = EXCLUDED."schemaVersion",
  "updatedAt" = GREATEST("UserSettingDocument"."updatedAt", EXCLUDED."updatedAt");
