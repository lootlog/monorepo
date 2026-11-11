import { PgliteClient } from "@effect/sql-pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Effect, ManagedRuntime } from "effect";
import { fileURLToPath } from "node:url";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "../src/database/drizzle/database.js";

let migratedDatabase: Promise<Blob> | undefined;

const readMigrations = () =>
  readMigrationFiles({
    migrationsFolder: fileURLToPath(
      new URL("../drizzle/migrations", import.meta.url),
    ),
  });

/**
 * The migrations up to, and not including, the first one whose SQL contains
 * `statement`. A data migration has to be exercised against the schema it was
 * written for: the constraint a later migration adds is often the very thing
 * the data migration exists to satisfy.
 */
const migrationsBefore = (statement: string) => {
  const migrations = readMigrations();

  const index = migrations.findIndex((migration) =>
    migration.sql.some((sql) => sql.includes(statement)),
  );

  if (index < 0) throw new Error(`No migration contains ${statement}`);

  return migrations.slice(0, index);
};

const createMigratedDatabase = async (statement?: string) => {
  // Loot search migrations install pg_trgm; PGlite only offers an extension
  // the client was created with.
  const runtime = ManagedRuntime.make(
    PgliteClient.layer({ extensions: { pg_trgm } }),
  );

  try {
    const client = await runtime.runPromise(PgliteClient.PgliteClient);

    const migrations =
      statement === undefined ? readMigrations() : migrationsBefore(statement);

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

export const createDatabaseBoundary = async (
  options: {
    /**
     * Stop before the migration whose SQL contains this statement, so a data
     * migration can run against the schema that still needs it. Such a
     * boundary builds its own image instead of sharing the fully migrated one.
     */
    readonly migratedBefore?: string;
  } = {},
) => {
  // Share only the immutable image. Live databases, transactions and disposal
  // stay independent, including when boundaries are acquired concurrently.
  const loadDataDir =
    options.migratedBefore === undefined
      ? await (migratedDatabase ??= createMigratedDatabase())
      : await createMigratedDatabase(options.migratedBefore);

  const runtime = ManagedRuntime.make(
    PgliteClient.layer({ extensions: { pg_trgm }, loadDataDir }),
  );

  try {
    const pgliteDatabase = await runtime.runPromise(makeWithDefaults());

    const database: ApiDatabaseValue & Pick<typeof pgliteDatabase, "$client"> =
      // SAFETY: PGlite stands in for @effect/sql-pg. Their raw `execute`
      // results differ only in metadata; the API reads `rows` alone.
      pgliteDatabase as never;

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
