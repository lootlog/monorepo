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

const createMigratedDatabase = async () => {
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

    for (const migration of migrations) {
      await client.pglite.exec(migration.sql.join("\n"));
    }

    return await runtime.runPromise(client.dumpDataDir("none"));
  } finally {
    await runtime.dispose();
  }
};

export const createDatabaseBoundary = async () => {
  const loadDataDir = await (migratedDatabase ??= createMigratedDatabase());

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
