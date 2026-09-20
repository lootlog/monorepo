import { BunRuntime } from "@effect/platform-bun";
import { migrationClient } from "@lootlog/database/migration";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { PgClientLive } from "./database.js";
import { prepareWarriorSearchIndexes } from "./prepare-warrior-search-indexes.js";

export const migrateBattlelogDatabase = Effect.gen(function* () {
  const client = yield* migrationClient;

  // Keep concurrent runners from racing during prebuild and journal updates.
  // The scoped connection releases the session lock on success or failure.
  yield* Effect.tryPromise(() =>
    client.query(
      "SELECT pg_advisory_lock(hashtext('lootlog:battlelog:migrations'))",
    ),
  );
  yield* prepareWarriorSearchIndexes(client);

  yield* Effect.tryPromise(() =>
    migrate(drizzle({ client }), {
      migrationsFolder: fileURLToPath(
        new URL("../../drizzle", import.meta.url),
      ),
    }),
  );
  yield* Effect.logInfo("Battlelog database migrations complete");
}).pipe(Effect.scoped);

if (import.meta.main) {
  BunRuntime.runMain(
    migrateBattlelogDatabase.pipe(Effect.provide(PgClientLive)),
  );
}
