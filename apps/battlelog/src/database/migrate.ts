import { BunRuntime } from "@effect/platform-bun";
import { runDrizzleMigrations } from "@lootlog/database/migration";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { PgClientLive } from "./database.js";

export const migrateBattlelogDatabase = runDrizzleMigrations({
  migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  lockKey: "lootlog:battlelog:migrations",
}).pipe(Effect.tap(Effect.logInfo("Battlelog database migrations complete")));

if (import.meta.main) {
  BunRuntime.runMain(
    migrateBattlelogDatabase.pipe(Effect.provide(PgClientLive)),
  );
}
