WITH "InferredMineNpcLevels" AS (
  SELECT
    npc_snapshot."id",
    MIN(NULLIF(item_snapshot."lvl", 0)) AS "lvl"
  FROM "NpcSnapshot" AS npc_snapshot
  INNER JOIN "LootNpc" AS loot_npc
    ON loot_npc."npcSnapshotId" = npc_snapshot."id"
  INNER JOIN "Loot" AS loot
    ON loot."id" = loot_npc."lootId"
    AND loot."source" = 'DIALOG'
  INNER JOIN "LootItem" AS loot_item
    ON loot_item."lootId" = loot."id"
  INNER JOIN "ItemSnapshot" AS item_snapshot
    ON item_snapshot."id" = loot_item."itemSnapshotId"
  WHERE npc_snapshot."lvl" = 0
    AND npc_snapshot."name" IN (
      'Pokaźne Złoże',
      'Large Deposit',
      'Naładowany kryształ',
      'Charged Crystal',
      'Błękitne złoże',
      'Azure Vein',
      'Niewydobyty minerał',
      'Unmined Mineral',
      'Zamrożony czarodziej',
      'Frozen Wizard'
    )
  GROUP BY npc_snapshot."id"
  HAVING COUNT(DISTINCT NULLIF(item_snapshot."lvl", 0)) = 1
)
UPDATE "NpcSnapshot" AS npc_snapshot
SET "lvl" = inferred."lvl"
FROM "InferredMineNpcLevels" AS inferred
WHERE npc_snapshot."id" = inferred."id";
