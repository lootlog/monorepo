import { PgliteClient } from "@effect/sql-pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Effect, ManagedRuntime } from "effect";
import { fileURLToPath } from "node:url";
import { ApiDatabase } from "../src/database/drizzle/database.js";

let migratedDatabase: Promise<Blob> | undefined;

const createMigratedDatabase = async () => {
  // Loot search migrations install pg_trgm; PGlite only offers an extension
  // the client was created with.
  const runtime = ManagedRuntime.make(
    PgliteClient.layer({ extensions: { pg_trgm } }),
  );

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

    // Keep the image private: no test can mutate the database it was built from.
    return await runtime.runPromise(client.dumpDataDir("none"));
  } finally {
    await runtime.dispose();
  }
};

export const createDatabaseBoundary = async () => {
  // Share only the immutable image. Live databases, transactions and disposal
  // stay independent, including when boundaries are acquired concurrently.
  const loadDataDir = await (migratedDatabase ??= createMigratedDatabase());

  const runtime = ManagedRuntime.make(
    PgliteClient.layer({ extensions: { pg_trgm }, loadDataDir }),
  );

  try {
    const database = await runtime.runPromise(makeWithDefaults());
    const client = await runtime.runPromise(PgliteClient.PgliteClient);
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
