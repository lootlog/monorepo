import { MARGONEM_TIME_ZONE } from "@lootlog/datetime";
import { Effect } from "effect";
import type { PgClient } from "@effect/sql-pg";
import type { Fragment } from "effect/sql/Statement";

type Sql = PgClient.PgClient;

export const upsertOnlineDays = (sql: Sql, source: Fragment) => sql`
  INSERT INTO "UserOnlineDay" ("userId", "date", "world", "spans")
  SELECT s."userId", g::date, COALESCE(s.world, ''),
    range_agg(tstzrange(
      GREATEST(s.start, g::timestamp AT TIME ZONE ${MARGONEM_TIME_ZONE}),
      LEAST(s.finish, (g::date + 1)::timestamp AT TIME ZONE ${MARGONEM_TIME_ZONE}),
      '[)'
    ))
  FROM (${source}) s
  CROSS JOIN LATERAL generate_series(
    date_trunc('day', s.start AT TIME ZONE ${MARGONEM_TIME_ZONE}),
    date_trunc('day', (s.finish - interval '1 microsecond') AT TIME ZONE ${MARGONEM_TIME_ZONE}),
    interval '1 day') g
  WHERE s.finish > s.start
  GROUP BY s."userId", g::date, COALESCE(s.world, '')
  ON CONFLICT ("userId", "date", "world") DO UPDATE
  SET "spans" = "UserOnlineDay"."spans" + EXCLUDED."spans"
  WHERE NOT "UserOnlineDay"."spans" @> EXCLUDED."spans"`;

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
        AND "date" BETWEEN (${start}::timestamptz AT TIME ZONE ${MARGONEM_TIME_ZONE})::date
          AND ((${finish}::timestamptz - interval '1 microsecond') AT TIME ZONE ${MARGONEM_TIME_ZONE})::date`;

    yield* upsertOnlineDays(
      sql,
      sql`SELECT "userId", world, "startedAt" AS start, "endedAt" AS finish
        FROM "UserOnlineInterval"
        WHERE "userId" = ${userId}
          AND "startedAt" < ((((${finish}::timestamptz - interval '1 microsecond') AT TIME ZONE ${MARGONEM_TIME_ZONE})::date + 1)::timestamp AT TIME ZONE ${MARGONEM_TIME_ZONE})
          AND "endedAt" > ((${start}::timestamptz AT TIME ZONE ${MARGONEM_TIME_ZONE})::date::timestamp AT TIME ZONE ${MARGONEM_TIME_ZONE})`,
    );
  });
