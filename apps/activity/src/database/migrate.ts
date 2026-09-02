import { BunRuntime } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { verifyAndAdoptDatabase } from "./adoption.js";
import { PgClientLive } from "./database.js";

const program = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  const table = yield* sql.unsafe<{ exists: boolean }>(
    `SELECT to_regclass('"Activity"') IS NOT NULL AS exists`,
  );
  if (!table[0]?.exists) {
    const migration = yield* Effect.promise(() =>
      Bun.file(
        new URL(
          "../../drizzle/migrations/0000_activity_legacy_baseline.sql",
          import.meta.url,
        ),
      ).text(),
    );
    yield* sql.unsafe(migration).unprepared;
  }
  yield* verifyAndAdoptDatabase();
});

BunRuntime.runMain(program.pipe(Effect.provide(PgClientLive)));
