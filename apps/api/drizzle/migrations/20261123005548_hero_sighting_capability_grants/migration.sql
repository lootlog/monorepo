UPDATE "Role"
SET permissions = array_append(
  permissions,
  'LOOTLOG_HERO_SIGHTINGS_READ'::"Permission"
)
WHERE 'LOOTLOG_TIMERS_HEROES_READ' = ANY(permissions)
  AND NOT 'LOOTLOG_HERO_SIGHTINGS_READ' = ANY(permissions);
--> statement-breakpoint
UPDATE "Role"
SET permissions = array_append(
  permissions,
  'LOOTLOG_HERO_SIGHTINGS_WRITE'::"Permission"
)
WHERE 'LOOTLOG_TIMERS_WRITE' = ANY(permissions)
  AND NOT 'LOOTLOG_HERO_SIGHTINGS_WRITE' = ANY(permissions);
