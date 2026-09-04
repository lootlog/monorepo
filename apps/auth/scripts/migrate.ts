import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabase, AuthDatabaseLive } from "../src/database/drizzle.js";
import { runAuthMigrations } from "../src/database/migrations.js";

const program = Effect.gen(function* () {
  const client = yield* PgClient.PgClient;
  const database = yield* AuthDatabase;
  yield* runAuthMigrations(database, client);
  yield* Effect.logInfo("Auth migrations applied");
}).pipe(
  Effect.provide(AuthDatabaseLive),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
