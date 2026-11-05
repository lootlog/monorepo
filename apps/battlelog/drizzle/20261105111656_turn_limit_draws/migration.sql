-- Margonem ends a battle that reaches the turn limit with `winner=?`.
-- Battlelog used to infer a winning team for it from the warriors' remaining
-- HP and damage, so draws counted as wins and losses. A draw has no winning
-- or losing team. A flee also ends with `winner=?` and keeps its inferred
-- teams, which the flee-aware views and analytics read. An unfinished battle
-- never has a winner name, so it is not matched.
--
-- `battles` is compressed by "userId" and ordered by id. Filtering the update
-- by `winner` alone decompresses every batch of the hypertable (7.7M rows on
-- the local production copy), so the update targets each user's draws by
-- their segment and ids, which decompresses only the batches that hold them.
-- TimescaleDB 2.24 also fails vectorized filters on two boolean columns, so
-- the draws are found by `winner` and `"hasFlee"` only.
SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction = 0;
--> statement-breakpoint
CREATE TEMP TABLE "turn_limit_draws" ON COMMIT DROP AS
SELECT "userId", array_agg("id") AS "ids"
FROM "battles"
WHERE "winner" = '?' AND NOT "hasFlee"
GROUP BY "userId";
--> statement-breakpoint
DO $$
DECLARE
  draws record;
BEGIN
  FOR draws IN SELECT "userId", "ids" FROM "turn_limit_draws" LOOP
    EXECUTE format(
      'UPDATE "battles" SET "winningTeam" = 0, "losingTeam" = 0 WHERE "userId" = %L AND "id" = ANY (%L::uuid[])',
      draws."userId",
      draws."ids"
    );
  END LOOP;
END $$;
