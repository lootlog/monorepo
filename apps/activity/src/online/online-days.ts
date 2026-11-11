import { Effect } from "effect";
import type { PgClient } from "@effect/sql-pg";
import type { Fragment } from "effect/sql/Statement";

export const ONLINE_TIME_ZONE = "Europe/Warsaw";

type Sql = PgClient.PgClient;

/**
 * Folds online intervals into "UserOnlineDay". The source yields "userId",
 * world, start and finish; each interval is split at Warsaw midnights and
 * merged into the stored spans of every day it touches. Set union makes the
 * statement idempotent, so redeliveries, overlapping sessions, out-of-order
 * checkpoints and a backfill racing live ingestion all converge. Days whose
 * stored spans already contain the new ones are not rewritten.
 *
 * Tagged SQL because the Drizzle builder has no multirange operators or
 * lateral generate_series.
 */
export const upsertOnlineDays = (sql: Sql, source: Fragment) => sql`
  INSERT INTO "UserOnlineDay" ("userId", "date", "world", "spans")
  SELECT s."userId", g::date, COALESCE(s.world, ''),
    range_agg(tstzrange(
      GREATEST(s.start, g::timestamp AT TIME ZONE ${ONLINE_TIME_ZONE}),
      LEAST(s.finish, (g::date + 1)::timestamp AT TIME ZONE ${ONLINE_TIME_ZONE}),
      '[)'
    ))
  FROM (${source}) s
  CROSS JOIN LATERAL generate_series(
    date_trunc('day', s.start AT TIME ZONE ${ONLINE_TIME_ZONE}),
    date_trunc('day', (s.finish - interval '1 microsecond') AT TIME ZONE ${ONLINE_TIME_ZONE}),
    interval '1 day') g
  WHERE s.finish > s.start
  GROUP BY s."userId", g::date, COALESCE(s.world, '')
  ON CONFLICT ("userId", "date", "world") DO UPDATE
  SET "spans" = "UserOnlineDay"."spans" + EXCLUDED."spans"
  WHERE NOT "UserOnlineDay"."spans" @> EXCLUDED."spans"`;

/**
 * Rebuilds the days an interval touches from the intervals themselves. A union
 * cannot take back time that was attributed to a world before a world-less
 * replay turned its segment unknown, so that rare case recomputes instead of
 * folding. Every interval overlapping those days is refolded, not only the one
 * that triggered the rebuild.
 */
export const rebuildOnlineDays = (
  sql: Sql,
  userId: string,
  start: string,
  finish: string,
) =>
  Effect.gen(function* () {
    yield* sql`
      DELETE FROM "UserOnlineDay"
      WHERE "userId" = ${userId}
        AND "date" BETWEEN (${start}::timestamptz AT TIME ZONE ${ONLINE_TIME_ZONE})::date
          AND ((${finish}::timestamptz - interval '1 microsecond') AT TIME ZONE ${ONLINE_TIME_ZONE})::date`;

    yield* upsertOnlineDays(
      sql,
      sql`SELECT "userId", world, "startedAt" AS start, "endedAt" AS finish
        FROM "UserOnlineInterval"
        WHERE "userId" = ${userId}
          AND "startedAt" < ((((${finish}::timestamptz - interval '1 microsecond') AT TIME ZONE ${ONLINE_TIME_ZONE})::date + 1)::timestamp AT TIME ZONE ${ONLINE_TIME_ZONE})
          AND "endedAt" > ((${start}::timestamptz AT TIME ZONE ${ONLINE_TIME_ZONE})::date::timestamp AT TIME ZONE ${ONLINE_TIME_ZONE})`,
    );
  });
