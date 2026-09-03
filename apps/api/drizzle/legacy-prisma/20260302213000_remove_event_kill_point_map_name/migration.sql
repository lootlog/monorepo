WITH ranked_points AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "killId", "memberId"
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn
  FROM "EventKillPoint"
)
DELETE FROM "EventKillPoint" point
USING ranked_points ranked
WHERE point.id = ranked.id
  AND ranked.rn > 1;

DROP INDEX IF EXISTS "EventKillPoint_killId_memberId_mapName_key";

ALTER TABLE "EventKillPoint"
DROP COLUMN "mapName";

CREATE UNIQUE INDEX "EventKillPoint_killId_memberId_key"
ON "EventKillPoint"("killId", "memberId");
