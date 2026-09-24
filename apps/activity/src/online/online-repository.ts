import { ONLINE_HISTORY_RETENTION_DAYS } from "./online-retention.js";
import { PgClient } from "@effect/sql-pg";
import { Clock, Context, Effect, Layer } from "effect";
import { and, count, inArray, lte, sql as drizzleSql } from "drizzle-orm";
import { ActivityDatabase } from "#src/database/database";
import { userOnlineIntervals } from "#src/database/schema";
import type { UserOnlineEventV1 } from "@lootlog/protocol/rabbit/events";
import type {
  UserOnlineQuery,
  UserOnlineResponse,
} from "#src/http-api/contracts/users/schemas";

export interface OnlineRepositoryValue {
  readonly ingest: (event: UserOnlineEventV1) => Effect.Effect<void, unknown>;
  readonly find: (
    userId: string,
    query: UserOnlineQuery,
  ) => Effect.Effect<UserOnlineResponse, unknown>;
  readonly prune: () => Effect.Effect<void, unknown>;
}

export class OnlineRepository extends Context.Service<
  OnlineRepository,
  OnlineRepositoryValue
>()("@lootlog/activity/OnlineRepository") {
  static readonly layer = Layer.effect(
    OnlineRepository,
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient;
      const db = yield* ActivityDatabase;

      const ingest = Effect.fn("OnlineRepository.ingest")(function* (
        event: UserOnlineEventV1,
      ) {
        const now = yield* Clock.currentTimeMillis;

        if (Date.parse(event.observedAt) > now + 60_000)
          return yield* Effect.fail(
            new Error("Online observation is in the future"),
          );

        if (event.type === "collector") {
          yield* sql`INSERT INTO "UserOnlineCollector" (id, "trackingStartedAt", "observedAt", status, "degradedUntil")
          VALUES (1, CASE WHEN ${event.status} = 'healthy' THEN ${event.observedAt}::timestamptz ELSE NULL END, ${event.observedAt}::timestamptz, ${event.status}, CASE WHEN ${event.status} = 'degraded' THEN ${event.observedAt}::timestamptz + interval '180 seconds' ELSE NULL END)
          ON CONFLICT (id) DO UPDATE SET
            "degradedUntil" = GREATEST("UserOnlineCollector"."degradedUntil", EXCLUDED."degradedUntil"),
            "trackingStartedAt" = LEAST("UserOnlineCollector"."trackingStartedAt", EXCLUDED."trackingStartedAt"),
            "observedAt" = GREATEST("UserOnlineCollector"."observedAt", EXCLUDED."observedAt"),
            status = CASE WHEN EXCLUDED."observedAt" > "UserOnlineCollector"."observedAt"
              OR (EXCLUDED."observedAt" = "UserOnlineCollector"."observedAt" AND EXCLUDED.status = 'degraded')
              THEN EXCLUDED.status ELSE "UserOnlineCollector".status END`;

          return;
        }

        if (
          Date.parse(event.startedAt) > Date.parse(event.endedAt) ||
          Date.parse(event.endedAt) > Date.parse(event.observedAt)
        ) {
          return yield* Effect.fail(
            new Error("Invalid online interval ordering"),
          );
        }

        const cutoff = new Date(
          now - ONLINE_HISTORY_RETENTION_DAYS * 86_400_000,
        ).toISOString();

        // Old redeliveries cannot resurrect expired history or establish tracking metadata.
        if (Date.parse(event.endedAt) <= Date.parse(cutoff)) return;
        // Normalize both starts to the same retention boundary: trimming must not break valid replays.
        yield* sql.withTransaction(
          Effect.gen(function* () {
            const inserted =
              yield* sql`INSERT INTO "UserOnlineInterval" ("userId", "sessionId", "segmentId", "world", "startedAt", "endedAt", "observedAt")
          VALUES (${event.userId}, ${event.sessionId}, ${event.segmentId}, ${event.world ?? null}, GREATEST(${event.startedAt}::timestamptz, ${cutoff}::timestamptz), ${event.endedAt}::timestamptz, ${event.observedAt}::timestamptz)
          ON CONFLICT ("userId", "sessionId", "segmentId") DO UPDATE
          SET "world" = CASE WHEN "UserOnlineInterval"."world" IS NULL OR EXCLUDED."world" IS NULL THEN NULL ELSE "UserOnlineInterval"."world" END,
              "startedAt" = GREATEST("UserOnlineInterval"."startedAt", EXCLUDED."startedAt"),
              "endedAt" = GREATEST("UserOnlineInterval"."endedAt", EXCLUDED."endedAt"),
              "observedAt" = GREATEST("UserOnlineInterval"."observedAt", EXCLUDED."observedAt")
          WHERE GREATEST("UserOnlineInterval"."startedAt", ${cutoff}::timestamptz) = EXCLUDED."startedAt"
            AND ("UserOnlineInterval"."world" IS NULL OR EXCLUDED."world" IS NULL OR "UserOnlineInterval"."world" = EXCLUDED."world")
          RETURNING "userId"`;

            if (!inserted.length)
              return yield* Effect.fail(
                new Error("Online segment start or world cannot change"),
              );
            yield* sql`INSERT INTO "UserOnlineTracking" ("userId", "lastObservedAt")
          VALUES (${event.userId}, ${event.observedAt}::timestamptz)
          ON CONFLICT ("userId") DO UPDATE
          SET "lastObservedAt" = GREATEST("UserOnlineTracking"."lastObservedAt", EXCLUDED."lastObservedAt")`;
          }),
        );
      });

      const find = Effect.fn("OnlineRepository.find")(function* (
        userId: string,
        query: UserOnlineQuery,
      ) {
        const now = yield* Clock.currentTimeMillis;
        const nowIso = new Date(now).toISOString();

        const cutoff = new Date(
          now - ONLINE_HISTORY_RETENTION_DAYS * 86_400_000,
        ).toISOString();

        const metadata = yield* sql<{
          trackingStartedAt: string | null;
          lastObservedAt: string | null;
          healthy: boolean;
        }>`
        SELECT c."trackingStartedAt"::text AS "trackingStartedAt", t."lastObservedAt"::text AS "lastObservedAt",
          COALESCE(c.status = 'healthy' AND c."observedAt" >= ${nowIso}::timestamptz - interval '180 seconds' AND (c."degradedUntil" IS NULL OR c."degradedUntil" <= ${nowIso}::timestamptz), false) AS healthy
        FROM (SELECT 1) seed LEFT JOIN "UserOnlineTracking" t ON t."userId" = ${userId}
        LEFT JOIN "UserOnlineCollector" c ON c.id = 1`;

        const meta = metadata[0];

        const trackingStartedAt = meta?.trackingStartedAt
          ? new Date(meta.trackingStartedAt).toISOString()
          : null;

        const lastObservedAt = meta?.lastObservedAt
          ? new Date(meta.lastObservedAt).toISOString()
          : null;

        const days = yield* sql<{
          date: string;
          onlineSeconds: number | null;
          partial: boolean;
          worlds: string[];
          worldsComplete: boolean;
        }>`
        WITH days AS (
          SELECT d::date AS date, d::timestamp AT TIME ZONE 'Europe/Warsaw' AS start,
            (d::date + 1)::timestamp AT TIME ZONE 'Europe/Warsaw' AS finish
          FROM generate_series(${query.from}::date::timestamp, ${query.to}::date::timestamp, interval '1 day') d
        ), source_intervals AS (
          SELECT "world", GREATEST("startedAt", ${cutoff}::timestamptz) AS start, "endedAt" AS finish
          FROM "UserOnlineInterval" WHERE "userId" = ${userId}
            AND "endedAt" > ${cutoff}::timestamptz
            AND "endedAt" > (SELECT min(start) FROM days)
            AND "startedAt" < (SELECT max(finish) FROM days)
        ), intervals AS (
          SELECT unnest(range_agg(tstzrange(start, finish, '[)'))) AS span FROM source_intervals
        )
        SELECT days.date::text AS date,
          ARRAY(SELECT DISTINCT world FROM source_intervals WHERE world IS NOT NULL
            AND start < days.finish AND finish > days.start AND finish > start ORDER BY world) AS worlds,
          NOT EXISTS(SELECT 1 FROM source_intervals WHERE world IS NULL
            AND start < days.finish AND finish > days.start AND finish > start) AS "worldsComplete",
          CASE WHEN ${trackingStartedAt}::timestamptz IS NULL OR days.finish <= ${trackingStartedAt}::timestamptz
            OR days.finish <= ${cutoff}::timestamptz OR days.start > ${nowIso}::timestamptz THEN NULL
          WHEN (days.start < ${trackingStartedAt}::timestamptz OR days.start < ${cutoff}::timestamptz)
            AND COALESCE(sum(EXTRACT(epoch FROM (LEAST(upper(span), days.finish) - GREATEST(lower(span), days.start)))) FILTER (WHERE span IS NOT NULL), 0) = 0 THEN NULL
          ELSE COALESCE(sum(EXTRACT(epoch FROM (LEAST(upper(span), days.finish) - GREATEST(lower(span), days.start)))) FILTER (WHERE span IS NOT NULL), 0)::double precision END AS "onlineSeconds",
          COALESCE(days.start < ${trackingStartedAt}::timestamptz AND days.finish > ${trackingStartedAt}::timestamptz, false)
            OR (days.start <= ${nowIso}::timestamptz AND days.finish > ${nowIso}::timestamptz)
            OR (days.start < ${cutoff}::timestamptz AND days.finish > ${cutoff}::timestamptz) AS partial
        FROM days LEFT JOIN intervals ON span && tstzrange(days.start, days.finish, '[)')
        GROUP BY days.date, days.start, days.finish ORDER BY days.date`;

        return {
          timezone: "Europe/Warsaw" as const,
          trackingStartedAt,
          lastObservedAt,
          status: !trackingStartedAt
            ? ("unavailable" as const)
            : meta?.healthy
              ? ("fresh" as const)
              : ("stale" as const),
          days,
        };
      });

      const prune = Effect.fn("OnlineRepository.prune")(function* () {
        const now = yield* Clock.currentTimeMillis;

        const cutoff = new Date(
          now - ONLINE_HISTORY_RETENTION_DAYS * 86_400_000,
        ).toISOString();

        const windowStart = new Date(
          Math.floor(now / 3600_000) * 3600_000,
        ).toISOString();

        // Each transaction changes at most 1000 rows per phase. A failed owner leaves the
        // fixed cutoff available to any replica; completed windows survive restarts.
        let pending = true;

        while (pending) {
          pending = yield* sql.withTransaction(
            Effect.gen(function* () {
              yield* sql`SET LOCAL statement_timeout = '5s'`;
              yield* sql`SET LOCAL lock_timeout = '1s'`;

              const lock = yield* sql<{ acquired: boolean }>`
                SELECT pg_try_advisory_xact_lock(hashtext('lootlog:activity:online-retention')) AS acquired`;

              if (!lock[0]?.acquired) return false;

              const state = yield* sql<{ cutoff: string; completed: boolean }>`
                INSERT INTO "UserOnlineRetention" (id, "windowStart", cutoff, completed)
                VALUES (1, ${windowStart}::timestamptz, ${cutoff}::timestamptz, false)
                ON CONFLICT (id) DO UPDATE SET
                  "windowStart" = EXCLUDED."windowStart", cutoff = EXCLUDED.cutoff, completed = false
                WHERE "UserOnlineRetention".completed AND "UserOnlineRetention"."windowStart" < EXCLUDED."windowStart"
                RETURNING cutoff::text, completed`;

              const current =
                state[0] ??
                (yield* sql<{ cutoff: string; completed: boolean }>`
                SELECT cutoff::text, completed FROM "UserOnlineRetention" WHERE id = 1`)[0];

              if (!current || current.completed) return false;

              const retentionCutoff = new Date(current.cutoff);

              // endedAt >= startedAt makes this indexed bound lossless, including
              // zero-duration intervals exactly at the cutoff. Long intervals
              // crossing it are retained and trimmed by the next phase.
              const expiredBatch = db
                .select({ ctid: drizzleSql<string>`ctid`.as("ctid") })
                .from(userOnlineIntervals)
                .where(
                  and(
                    lte(userOnlineIntervals.startedAt, retentionCutoff),
                    lte(userOnlineIntervals.endedAt, retentionCutoff),
                  ),
                )
                .orderBy(userOnlineIntervals.startedAt)
                .limit(1000)
                .for("update");

              // PostgreSQL's ctid has no schema column; row locks keep these
              // physical identifiers stable through this statement.
              const removed = db.$with("removed").as(
                db
                  .delete(userOnlineIntervals)
                  .where(inArray(drizzleSql`ctid`, expiredBatch))
                  .returning({ value: drizzleSql`1`.as("value") }),
              );

              const expired = yield* db
                .with(removed)
                .select({ count: count() })
                .from(removed);

              if (expired[0]?.count === 1000) return true;

              const trimmed = yield* sql<{ count: number }>`
                WITH updated AS (
                  UPDATE "UserOnlineInterval" SET "startedAt" = ${current.cutoff}::timestamptz
                  WHERE ctid IN (
                    SELECT ctid FROM "UserOnlineInterval"
                    WHERE "startedAt" < ${current.cutoff}::timestamptz
                      AND "endedAt" > ${current.cutoff}::timestamptz
                    ORDER BY "startedAt" LIMIT 1000 FOR UPDATE
                  ) RETURNING 1
                ) SELECT count(*)::int AS count FROM updated`;

              if (trimmed[0]?.count === 1000) return true;

              const tracking = yield* sql<{ count: number }>`
                WITH removed AS (
                  DELETE FROM "UserOnlineTracking" WHERE ctid IN (
                    SELECT ctid FROM "UserOnlineTracking"
                    WHERE "lastObservedAt" <= ${current.cutoff}::timestamptz
                    ORDER BY "lastObservedAt" LIMIT 1000 FOR UPDATE
                  ) RETURNING 1
                ) SELECT count(*)::int AS count FROM removed`;

              if (tracking[0]?.count === 1000) return true;

              yield* sql`UPDATE "UserOnlineRetention" SET completed = true WHERE id = 1`;

              // A recovered older window may finish after the next one is due.
              return true;
            }),
          );
        }
      });

      return OnlineRepository.of({ ingest, find, prune });
    }),
  ).pipe(Layer.provide(ActivityDatabase.layer));
}
