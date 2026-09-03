import { BunRuntime } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import {
  adoptExistingApiDatabase,
  type SqlTransactionClient,
} from "./adoption.js";
import { ApiDatabase, ApiDatabaseLive } from "./database.js";

const migrationsFolder = fileURLToPath(
  new URL("../../../drizzle/migrations", import.meta.url),
);

const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

const adoptDatabase = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  const connection = yield* sql.reserve;
  const client: SqlTransactionClient = {
    query: async <Row extends Record<string, unknown>>(
      statement: string,
      values: ReadonlyArray<unknown> = [],
    ) => {
      const rows = await Effect.runPromise(
        connection.execute(statement, values, undefined),
      );
      return { rows: rows as ReadonlyArray<Row> };
    },
  };

  return yield* Effect.tryPromise({
    try: () => adoptExistingApiDatabase(client),
    catch: toError,
  });
});

export const migrateApiDatabase = Effect.gen(function* () {
  const adoption = yield* adoptDatabase;
  const database = yield* ApiDatabase;
  yield* migrate(database, { migrationsFolder });
  yield* Effect.logInfo("API database migrations complete", {
    adoptionStatus: adoption.status,
  });
});

BunRuntime.runMain(
  migrateApiDatabase.pipe(Effect.scoped, Effect.provide(ApiDatabaseLive)),
);
