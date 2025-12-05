/*
  Warnings:

  - The values [LOOTLOG_READ,LOOTLOG_WRITE,LOOTLOG_READ_TIMERS_TITANS,LOOTLOG_READ_LOOTS_TITANS,LOOTLOG_READ_TIMERS_HEROES,LOOTLOG_READ_LOOTS_HEROES,LOOTLOG_RESERVATIONS] on the enum `Permission` will be removed. If these variants are still used in the database, this will fail.

*/

-- Step 1: Convert permissions column to text[] temporarily to allow string manipulation
ALTER TABLE "Role" ALTER COLUMN "permissions" DROP DEFAULT;
ALTER TABLE "Role" ALTER COLUMN "permissions" TYPE text[] USING ("permissions"::text[]);

-- Step 2: Transform old permissions to new permissions
-- Add new permissions for roles that had LOOTLOG_READ
UPDATE "Role" 
SET permissions = array_cat(
  permissions,
  ARRAY['LOOTLOG_ACCESS', 'LOOTLOG_LOOTS_READ', 'LOOTLOG_LOOTS_WRITE', 'LOOTLOG_TIMERS_READ', 'LOOTLOG_TIMERS_WRITE', 'LOOTLOG_RESERVATIONS_READ', 'LOOTLOG_RESERVATIONS_WRITE', 'LOOTLOG_MEMBERS_READ', 'LOOTLOG_CHAT_READ', 'LOOTLOG_CHAT_WRITE', 'LOOTLOG_NOTIFICATIONS_READ']
)
WHERE 'LOOTLOG_READ' = ANY(permissions);

-- Remove LOOTLOG_READ from permissions
UPDATE "Role"
SET permissions = array_remove(permissions, 'LOOTLOG_READ')
WHERE 'LOOTLOG_READ' = ANY(permissions);

-- Add new permissions for roles that had LOOTLOG_WRITE (if they weren't already added from LOOTLOG_READ)
UPDATE "Role"
SET permissions = array_cat(
  permissions,
  ARRAY['LOOTLOG_LOOTS_WRITE', 'LOOTLOG_TIMERS_WRITE', 'LOOTLOG_TIMERS_RESET', 'LOOTLOG_TIMERS_DELETE']
)
WHERE 'LOOTLOG_WRITE' = ANY(permissions)
AND NOT 'LOOTLOG_LOOTS_WRITE' = ANY(permissions);

-- Remove LOOTLOG_WRITE from permissions
UPDATE "Role"
SET permissions = array_remove(permissions, 'LOOTLOG_WRITE')
WHERE 'LOOTLOG_WRITE' = ANY(permissions);

-- Transform LOOTLOG_READ_TIMERS_TITANS -> all TITAN permissions
UPDATE "Role"
SET permissions = array_cat(
  array_remove(permissions, 'LOOTLOG_READ_TIMERS_TITANS'),
  ARRAY['LOOTLOG_TIMERS_TITANS_READ', 'LOOTLOG_LOOTS_TITANS_READ', 'LOOTLOG_CHAT_TITANS_READ', 'LOOTLOG_NOTIFICATIONS_TITANS_READ']
)
WHERE 'LOOTLOG_READ_TIMERS_TITANS' = ANY(permissions);

-- Transform LOOTLOG_READ_LOOTS_TITANS -> all TITAN permissions (if not already added)
UPDATE "Role"
SET permissions = array_cat(
  array_remove(permissions, 'LOOTLOG_READ_LOOTS_TITANS'),
  ARRAY['LOOTLOG_TIMERS_TITANS_READ', 'LOOTLOG_LOOTS_TITANS_READ', 'LOOTLOG_CHAT_TITANS_READ', 'LOOTLOG_NOTIFICATIONS_TITANS_READ']
)
WHERE 'LOOTLOG_READ_LOOTS_TITANS' = ANY(permissions);

-- Transform LOOTLOG_READ_TIMERS_HEROES -> all HEROES permissions
UPDATE "Role"
SET permissions = array_cat(
  array_remove(permissions, 'LOOTLOG_READ_TIMERS_HEROES'),
  ARRAY['LOOTLOG_TIMERS_HEROES_READ', 'LOOTLOG_LOOTS_HEROES_READ', 'LOOTLOG_CHAT_HEROES_READ', 'LOOTLOG_NOTIFICATIONS_HEROES_READ']
)
WHERE 'LOOTLOG_READ_TIMERS_HEROES' = ANY(permissions);

-- Transform LOOTLOG_READ_LOOTS_HEROES -> all HEROES permissions (if not already added)
UPDATE "Role"
SET permissions = array_cat(
  array_remove(permissions, 'LOOTLOG_READ_LOOTS_HEROES'),
  ARRAY['LOOTLOG_TIMERS_HEROES_READ', 'LOOTLOG_LOOTS_HEROES_READ', 'LOOTLOG_CHAT_HEROES_READ', 'LOOTLOG_NOTIFICATIONS_HEROES_READ']
)
WHERE 'LOOTLOG_READ_LOOTS_HEROES' = ANY(permissions);

-- Transform LOOTLOG_RESERVATIONS to LOOTLOG_RESERVATIONS_READ + LOOTLOG_RESERVATIONS_WRITE
UPDATE "Role"
SET permissions = array_cat(
  array_remove(permissions, 'LOOTLOG_RESERVATIONS'),
  ARRAY['LOOTLOG_RESERVATIONS_READ', 'LOOTLOG_RESERVATIONS_WRITE']
)
WHERE 'LOOTLOG_RESERVATIONS' = ANY(permissions);

-- Remove duplicates from permissions arrays
UPDATE "Role"
SET permissions = (
  SELECT COALESCE(array_agg(DISTINCT elem), ARRAY[]::text[])
  FROM unnest(permissions) AS elem
);

-- Step 3: Create new enum and convert column
CREATE TYPE "Permission_new" AS ENUM (
  'OWNER',
  'ADMIN',
  'LOOTLOG_MANAGE',
  'LOOTLOG_ACCESS',
  'LOOTLOG_LOOTS_READ',
  'LOOTLOG_LOOTS_WRITE',
  'LOOTLOG_LOOTS_TITANS_READ',
  'LOOTLOG_LOOTS_HEROES_READ',
  'LOOTLOG_TIMERS_READ',
  'LOOTLOG_TIMERS_WRITE',
  'LOOTLOG_TIMERS_RESET',
  'LOOTLOG_TIMERS_DELETE',
  'LOOTLOG_TIMERS_TITANS_READ',
  'LOOTLOG_TIMERS_HEROES_READ',
  'LOOTLOG_RESERVATIONS_READ',
  'LOOTLOG_RESERVATIONS_WRITE',
  'LOOTLOG_MEMBERS_READ',
  'LOOTLOG_CHAT_READ',
  'LOOTLOG_CHAT_WRITE',
  'LOOTLOG_CHAT_TITANS_READ',
  'LOOTLOG_CHAT_HEROES_READ',
  'LOOTLOG_NOTIFICATIONS_READ',
  'LOOTLOG_NOTIFICATIONS_SEND',
  'LOOTLOG_NOTIFICATIONS_TITANS_READ',
  'LOOTLOG_NOTIFICATIONS_HEROES_READ'
);
ALTER TABLE "Role" ALTER COLUMN "permissions" TYPE "Permission_new"[] USING ("permissions"::"Permission_new"[]);
DROP TYPE "Permission";
ALTER TYPE "Permission_new" RENAME TO "Permission";
ALTER TABLE "Role" ALTER COLUMN "permissions" SET DEFAULT ARRAY[]::"Permission"[];
