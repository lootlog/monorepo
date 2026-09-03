UPDATE "Role"
SET permissions = array_append(
  permissions,
  'LOOTLOG_PRESENCE_LOCATION_READ'::"Permission"
)
WHERE 'LOOTLOG_ONLINE_PLAYERS_READ' = ANY(permissions)
  AND NOT 'LOOTLOG_PRESENCE_LOCATION_READ' = ANY(permissions);
