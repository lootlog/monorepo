import { BunRuntime } from "@effect/platform-bun";
import { migrationClient } from "@lootlog/database/migration";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { PgClientLive } from "./database.js";

export const migrateCatalogDatabase = Effect.gen(function* () {
  const client = yield* migrationClient;

  // The scoped connection holds the lock until migration and journal writes finish.
  yield* Effect.tryPromise(() =>
    client.query(
      "SELECT pg_advisory_lock(hashtext('lootlog:catalog:migrations'))",
    ),
  );
  yield* Effect.tryPromise(() =>
    migrate(drizzle({ client }), {
      migrationsFolder: fileURLToPath(
        new URL("../../drizzle/migrations", import.meta.url),
      ),
    }),
  );
  yield* Effect.logInfo("Catalog database migrations complete");
}).pipe(Effect.scoped);

if (import.meta.main) {
  BunRuntime.runMain(migrateCatalogDatabase.pipe(Effect.provide(PgClientLive)));
}
