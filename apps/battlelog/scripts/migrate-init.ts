/**
 * Marks the pre-rewrite migration history as applied without executing its SQL.
 * Use only on databases that already have those tables (e.g. created by Prisma).
 *
 * Usage: bun scripts/migrate-init.ts
 */
import { BunRuntime } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { PgClientLive } from "../src/database/database.js";

export const adoptBattlelogDatabase = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  yield* sql.withTransaction(
    Effect.gen(function* () {
      yield* sql.unsafe("CREATE SCHEMA IF NOT EXISTS drizzle");
      yield* sql.unsafe(`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint,
          name text,
          applied_at timestamp with time zone DEFAULT now()
        )
      `);
      const existing = yield* sql.unsafe(
        "SELECT id FROM drizzle.__drizzle_migrations",
      );
      if (existing.length > 0) {
        yield* Effect.logInfo("Migrations already tracked; nothing to adopt");
        return;
      }

      const migrations = yield* Effect.try(() =>
        readMigrationFiles({
          migrationsFolder: fileURLToPath(
            new URL("../drizzle", import.meta.url),
          ),
        }),
      );
      // Only the pre-rewrite history can be adopted; new migrations must execute.
      for (const migration of migrations) {
        if (migration.name > "20260726194145_plain_gorgon") continue;
        yield* sql.unsafe(
          "INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name) VALUES ($1, $2, $3)",
          [migration.hash, migration.folderMillis, migration.name],
        );
        yield* Effect.logInfo("Marked migration as applied", {
          migration: migration.name,
        });
      }
    }),
  );
});

if (import.meta.main) {
  BunRuntime.runMain(adoptBattlelogDatabase.pipe(Effect.provide(PgClientLive)));
}
