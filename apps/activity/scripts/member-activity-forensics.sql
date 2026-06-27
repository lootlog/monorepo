-- Usage:
-- psql "$POSTGRESQL_CONNECTION_URI" \
--   -v guild_id='DISCORD_GUILD_ID' \
--   -v discord_id='DISCORD_USER_ID' \
--   -v limit=200 \
--   -f apps/activity/scripts/member-activity-forensics.sql

\if :{?limit}
\else
\set limit 200
\endif

\echo '== MemberActivityStats =='
SELECT
  "guildId",
  "discordId",
  "source",
  "lastSeenAt",
  "visitCount",
  "activeSessionCount",
  "createdAt",
  "updatedAt"
FROM "MemberActivityStats"
WHERE "guildId" = :'guild_id'
  AND "discordId" = :'discord_id'
ORDER BY "source";

\echo '== Active MemberActivitySession ledger =='
SELECT
  "guildId",
  "discordId",
  "source",
  "sessionId",
  "userId",
  "world",
  "userAgent",
  "connectedAt",
  "lastSeenAt"
FROM "MemberActivitySession"
WHERE "guildId" = :'guild_id'
  AND "discordId" = :'discord_id'
ORDER BY "connectedAt" DESC;

\echo '== Activity timeline =='
SELECT
  a."createdAt",
  a."id",
  a."type",
  a."source",
  a."guildId",
  a."discordId",
  a."userId",
  a."world",
  a."idempotencyKey",
  CASE
    WHEN a."idempotencyKey" ~ '^(connect_event|disconnect_event)_[^_]+_[^_]+_[0-9]+$'
      THEN 'gateway-shape'
    ELSE 'manual-or-unknown-shape'
  END AS "idempotencyShape",
  a."details" ->> 'sessionId' AS "detailsSessionId",
  a."details" ->> 'userAgent' AS "detailsUserAgent",
  s."accountId" AS "actorAccountId",
  s."characterId" AS "actorCharacterId",
  s."name" AS "actorName",
  s."clanName" AS "actorClanName",
  s."lvl" AS "actorLvl",
  s."prof" AS "actorProf"
FROM "Activity" a
LEFT JOIN "ActivityActorSnapshot" s ON s."id" = a."actorSnapshotId"
WHERE a."guildId" = :'guild_id'
  AND a."discordId" = :'discord_id'
ORDER BY a."createdAt" DESC
LIMIT :limit;
