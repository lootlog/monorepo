import { BunRuntime } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { PgClientLive } from "./database.js";
import { upsertOnlineDays } from "#src/online/online-days";

const WINDOW_MS = 6 * 3600_000;

/**
 * Rebuilds "UserOnlineDay" from "UserOnlineInterval" in startedAt windows, which
 * follow the heap order instead of seeking each user's scattered rows. The fold
 * is a set union, so the script can be repeated and may run while the activity
 * service ingests. Pass a start (ISO timestamp) to rebuild only recent history.
 */
export const backfillOnlineDays = (since?: string) =>
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const range = yield* sql<{ min: string | null; max: string | null }>`
      SELECT min("startedAt")::text AS min, max("startedAt")::text AS max
      FROM "UserOnlineInterval"
      WHERE ${since ?? null}::timestamptz IS NULL OR "startedAt" >= ${since ?? null}::timestamptz`;

    if (!range[0]?.min || !range[0].max) return;

    const end = Date.parse(range[0].max);
    let windows = 0;

    for (let from = Date.parse(range[0].min); from <= end; from += WINDOW_MS) {
      const start = new Date(from).toISOString();
      const next = new Date(from + WINDOW_MS).toISOString();

      yield* upsertOnlineDays(
        sql,
        sql`SELECT "userId", world, "startedAt" AS start, "endedAt" AS finish
          FROM "UserOnlineInterval"
          WHERE "startedAt" >= ${start}::timestamptz AND "startedAt" < ${next}::timestamptz`,
      );

      windows++;

      if (windows % 20 === 0)
        yield* Effect.logInfo("Online day backfill progress", { next });
    }

    yield* Effect.logInfo("Online day backfill complete", { windows });
  });

if (import.meta.main) {
  BunRuntime.runMain(
    backfillOnlineDays(process.argv[2]).pipe(Effect.provide(PgClientLive)),
  );
}
