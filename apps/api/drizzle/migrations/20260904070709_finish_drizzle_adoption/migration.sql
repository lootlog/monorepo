UPDATE "Role"
SET permissions = array_append(
  permissions,
  'LOOTLOG_PRESENCE_LOCATION_READ'::"Permission"
)
WHERE 'LOOTLOG_ONLINE_PLAYERS_READ' = ANY(permissions)
  AND NOT 'LOOTLOG_PRESENCE_LOCATION_READ' = ANY(permissions);

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
