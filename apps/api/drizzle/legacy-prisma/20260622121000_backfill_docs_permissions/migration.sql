-- Backfill docs access for existing administrative roles.
UPDATE "Role"
SET permissions = array_cat(
  permissions,
  ARRAY['LOOTLOG_DOCS_READ', 'LOOTLOG_DOCS_WRITE']::"Permission"[]
)
WHERE (
  'OWNER' = ANY(permissions)
  OR 'ADMIN' = ANY(permissions)
)
AND (
  NOT 'LOOTLOG_DOCS_READ' = ANY(permissions)
  OR NOT 'LOOTLOG_DOCS_WRITE' = ANY(permissions)
);

-- Remove duplicates from permission arrays.
UPDATE "Role"
SET permissions = (
  SELECT COALESCE(array_agg(DISTINCT permission), ARRAY[]::"Permission"[])
  FROM unnest(permissions) AS permission
);
