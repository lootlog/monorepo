import { BunRuntime } from "@effect/platform-bun";
import { migrationClient } from "@lootlog/database/migration";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { ApiDatabaseLive } from "./database.js";

const migrationsFolder = fileURLToPath(
  new URL("../../../drizzle/migrations", import.meta.url),
);

export const migrateApiDatabase = Effect.gen(function* () {
  const client = yield* migrationClient;

  yield* Effect.tryPromise(() =>
    migrate(drizzle({ client }), { migrationsFolder }),
  );
  yield* Effect.logInfo("API database migrations complete");
}).pipe(Effect.scoped);

if (import.meta.main) {
  BunRuntime.runMain(
    migrateApiDatabase.pipe(Effect.scoped, Effect.provide(ApiDatabaseLive)),
  );
}
