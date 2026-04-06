-- Migrate NotificationRule filters from npcId/npcIds to npcName/npcNames
-- using NPC names resolved from the Timer table.

-- Step 1: Migrate rules with filters->npcId (single NPC)
-- Find the NPC name from Timer.npc->>'name' matching the npcId.
UPDATE "NotificationRule" nr
SET "filters" = (
  nr."filters"::jsonb
  - 'npcId'
  || jsonb_build_object('npcName', t."npcName")
)::jsonb
FROM (
  SELECT DISTINCT ON (sub."npcId")
    sub."npcId",
    sub."npc" ->> 'name' AS "npcName"
  FROM "Timer" sub
  WHERE sub."npc" ->> 'name' IS NOT NULL
  ORDER BY sub."npcId", sub."updatedAt" DESC
) t
WHERE nr."filters" IS NOT NULL
  AND (nr."filters"::jsonb) ? 'npcId'
  AND (nr."filters" ->> 'npcId')::int = t."npcId";

-- Step 2: Migrate rules with filters->npcIds (array of NPC IDs)
-- For each rule, resolve all NPC IDs to names and build npcNames array.
UPDATE "NotificationRule" nr
SET "filters" = (
  nr."filters"::jsonb
  - 'npcIds'
  || jsonb_build_object('npcNames', (
    SELECT jsonb_agg(DISTINCT t."npcName")
    FROM jsonb_array_elements_text(nr."filters" -> 'npcIds') AS elem
    JOIN (
      SELECT DISTINCT ON (sub."npcId")
        sub."npcId",
        sub."npc" ->> 'name' AS "npcName"
      FROM "Timer" sub
      WHERE sub."npc" ->> 'name' IS NOT NULL
      ORDER BY sub."npcId", sub."updatedAt" DESC
    ) t ON t."npcId" = elem::int
  ))
)::jsonb
WHERE nr."filters" IS NOT NULL
  AND (nr."filters"::jsonb) ? 'npcIds'
  AND jsonb_array_length(nr."filters" -> 'npcIds') > 0;
