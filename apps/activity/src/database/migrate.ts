import { BunRuntime } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { verifyAndAdoptDatabase } from "./adoption.js";
import { PgClientLive } from "./database.js";

export const migrateActivityDatabase = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  const table = yield* sql.unsafe<{ exists: boolean }>(
    `SELECT to_regclass('"Activity"') IS NOT NULL AS exists`,
  );
  if (!table[0]?.exists) {
    const migration = yield* Effect.tryPromise({
      try: () =>
        Bun.file(
          new URL(
            "../../drizzle/migrations/0000_activity_legacy_baseline.sql",
            import.meta.url,
          ),
        ).text(),
      catch: (cause) =>
        new Error("Failed to read baseline migration", { cause }),
    });
    yield* sql.unsafe(migration).unprepared;
  }
  yield* verifyAndAdoptDatabase();
  const onlineMigration = yield* Effect.tryPromise({
    try: () =>
      Bun.file(
        new URL(
          "../../drizzle/migrations/0001_user_online_history.sql",
          import.meta.url,
        ),
      ).text(),
    catch: (cause) =>
      new Error("Failed to read online history migration", { cause }),
  });
  yield* sql.unsafe(onlineMigration).unprepared;
  const onlineRetentionMigration = yield* Effect.tryPromise({
    try: () =>
      Bun.file(
        new URL(
          "../../drizzle/migrations/0002_online_history_16_week_retention.sql",
          import.meta.url,
        ),
      ).text(),
    catch: (cause) =>
      new Error("Failed to read online retention migration", { cause }),
  });
  yield* sql.unsafe(onlineRetentionMigration).unprepared;
});

if (import.meta.main) {
  BunRuntime.runMain(
    migrateActivityDatabase.pipe(Effect.provide(PgClientLive)),
  );
}
