import { BunRuntime } from "@effect/platform-bun";
import { migrationClient } from "@lootlog/database/migration";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { PgClientLive } from "./database.js";

export const migrateBattlelogDatabase = Effect.gen(function* () {
  const client = yield* migrationClient;

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
