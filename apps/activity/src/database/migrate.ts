import { BunRuntime } from "@effect/platform-bun";
import { runDrizzleMigrations } from "@lootlog/database/migration";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { PgClientLive } from "./database.js";

export const migrateActivityDatabase = runDrizzleMigrations({
  migrationsFolder: fileURLToPath(
    new URL("../../drizzle/migrations", import.meta.url),
  ),
  lockKey: "lootlog:activity:migrations",
}).pipe(Effect.tap(Effect.logInfo("Activity database migrations complete")));

if (import.meta.main) {
  BunRuntime.runMain(
    migrateActivityDatabase.pipe(Effect.provide(PgClientLive)),
  );
}
