-- Backfill online players access for existing broad/read roles.
UPDATE "Role"
SET permissions = array_cat(
  permissions,
  ARRAY['LOOTLOG_ONLINE_PLAYERS_READ']::"Permission"[]
)
WHERE (
  'OWNER' = ANY(permissions)
  OR 'ADMIN' = ANY(permissions)
  OR 'LOOTLOG_LOOTS_READ' = ANY(permissions)
  OR 'LOOTLOG_TIMERS_READ' = ANY(permissions)
)
AND NOT 'LOOTLOG_ONLINE_PLAYERS_READ' = ANY(permissions);

-- Remove duplicates from permission arrays.
UPDATE "Role"
SET permissions = (
  SELECT COALESCE(array_agg(DISTINCT permission), ARRAY[]::"Permission"[])
  FROM unnest(permissions) AS permission
);
