import { BunRuntime } from "@effect/platform-bun";
import { runDrizzleMigrations } from "@lootlog/database/migration";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { ApiDatabaseLive } from "./database.js";

export const migrateApiDatabase = runDrizzleMigrations({
  migrationsFolder: fileURLToPath(
    new URL("../../../drizzle/migrations", import.meta.url),
  ),
  lockKey: "lootlog:api:migrations",
}).pipe(Effect.tap(Effect.logInfo("API database migrations complete")));

if (import.meta.main) {
  BunRuntime.runMain(
    migrateApiDatabase.pipe(Effect.scoped, Effect.provide(ApiDatabaseLive)),
  );
}
