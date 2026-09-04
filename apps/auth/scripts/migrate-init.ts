import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabaseLive } from "../src/database/drizzle.js";
import { initializeAuthMigrations } from "../src/database/migrations.js";

const program = Effect.gen(function* () {
  const client = yield* PgClient.PgClient;
  yield* initializeAuthMigrations(client);
  yield* Effect.logInfo("Auth migrations initialized");
}).pipe(
  Effect.provide(AuthDatabaseLive),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
