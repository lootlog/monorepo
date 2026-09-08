import { BunRuntime } from "@effect/platform-bun";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { drizzleDatabaseEffect, PgClientLive } from "./database.js";

export const migrateBattlelogDatabase = Effect.gen(function* () {
  const database = yield* drizzleDatabaseEffect;
  yield* migrate(database, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  yield* Effect.logInfo("Battlelog database migrations complete");
});

if (import.meta.main) {
  BunRuntime.runMain(
    migrateBattlelogDatabase.pipe(Effect.provide(PgClientLive)),
  );
}
