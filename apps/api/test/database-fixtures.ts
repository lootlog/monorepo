import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Effect, ManagedRuntime } from "effect";
import { fileURLToPath } from "node:url";
import { ApiDatabase } from "../src/database/drizzle/database.js";

export const createDatabaseBoundary = async () => {
  const runtime = ManagedRuntime.make(PgliteClient.layer({}));
  const database = await runtime.runPromise(makeWithDefaults());

  try {
    const client = await runtime.runPromise(PgliteClient.PgliteClient);

    const migrations = readMigrationFiles({
      migrationsFolder: fileURLToPath(
        new URL("../drizzle/migrations", import.meta.url),
      ),
    });

    // The baseline contains multiple statements without Drizzle breakpoints.
    // PGlite exec accepts the unchanged migration batch via PostgreSQL's simple protocol.
    for (const migration of migrations) {
      await client.pglite.exec(migration.sql.join("\n"));
    }

    await runtime.runPromise(client.refreshArrayTypes);

    return {
      database,
      run: <A, E>(effect: Effect.Effect<A, E, ApiDatabase>) =>
        runtime.runPromise(
          Effect.provideService(effect, ApiDatabase, database),
        ),
      dispose: () => runtime.dispose(),
    };
  } catch (cause) {
    await runtime.dispose();
    throw cause;
  }
};
