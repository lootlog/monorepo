import { BunRuntime } from "@effect/platform-bun";
import { runDrizzleMigrations } from "@lootlog/database/migration";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { PgClientLive } from "./database.js";

export const migrateCatalogDatabase = runDrizzleMigrations({
  migrationsFolder: fileURLToPath(
    new URL("../../drizzle/migrations", import.meta.url),
  ),
  lockKey: "lootlog:catalog:migrations",
}).pipe(Effect.tap(Effect.logInfo("Catalog database migrations complete")));

if (import.meta.main) {
  BunRuntime.runMain(migrateCatalogDatabase.pipe(Effect.provide(PgClientLive)));
}
