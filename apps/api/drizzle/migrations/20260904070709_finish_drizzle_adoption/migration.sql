UPDATE "Role"
SET permissions = '{}'::"Permission"[]
WHERE permissions IS NULL;

UPDATE "Role"
SET permissions = array_append(
  permissions,
  'LOOTLOG_PRESENCE_LOCATION_READ'::"Permission"
)
WHERE 'LOOTLOG_ONLINE_PLAYERS_READ' = ANY(permissions)
  AND NOT 'LOOTLOG_PRESENCE_LOCATION_READ' = ANY(permissions);

UPDATE "DiscordGuildChannelSnapshot"
SET
  "grantedPermissions" = COALESCE("grantedPermissions", '{}'::text[]),
  "missingPermissions" = COALESCE("missingPermissions", '{}'::text[]),
  "requiredPermissions" = COALESCE("requiredPermissions", '{}'::text[])
WHERE "grantedPermissions" IS NULL
  OR "missingPermissions" IS NULL
  OR "requiredPermissions" IS NULL;

UPDATE "DiscordGuildSyncState"
SET
  "grantedPermissions" = COALESCE("grantedPermissions", '{}'::text[]),
  "missingPermissions" = COALESCE("missingPermissions", '{}'::text[]),
  "requiredPermissions" = COALESCE("requiredPermissions", '{}'::text[])
WHERE "grantedPermissions" IS NULL
  OR "missingPermissions" IS NULL
  OR "requiredPermissions" IS NULL;

UPDATE "LootlogConfigNpc"
SET "allowedRarities" = '{}'::"ItemRarity"[]
WHERE "allowedRarities" IS NULL;

UPDATE "UserGuildTimerSettings"
SET
  "hiddenTimers" = COALESCE("hiddenTimers", '{}'::text[]),
  "pinnedTimers" = COALESCE("pinnedTimers", '{}'::text[])
WHERE "hiddenTimers" IS NULL OR "pinnedTimers" IS NULL;

UPDATE "UserSettings"
SET "guildsOrder" = '{}'::text[]
WHERE "guildsOrder" IS NULL;

ALTER TABLE "DiscordGuildChannelSnapshot"
  ALTER COLUMN "grantedPermissions" SET NOT NULL,
  ALTER COLUMN "missingPermissions" SET NOT NULL,
  ALTER COLUMN "requiredPermissions" SET NOT NULL;

ALTER TABLE "DiscordGuildSyncState"
  ALTER COLUMN "grantedPermissions" SET NOT NULL,
  ALTER COLUMN "missingPermissions" SET NOT NULL,
  ALTER COLUMN "requiredPermissions" SET NOT NULL;

ALTER TABLE "LootlogConfigNpc"
  ALTER COLUMN "allowedRarities" SET NOT NULL;

ALTER TABLE "Role"
  ALTER COLUMN "permissions" SET NOT NULL;

ALTER TABLE "UserGuildTimerSettings"
  ALTER COLUMN "hiddenTimers" SET NOT NULL,
  ALTER COLUMN "pinnedTimers" SET NOT NULL;

ALTER TABLE "UserSettings"
  ALTER COLUMN "guildsOrder" SET NOT NULL;
