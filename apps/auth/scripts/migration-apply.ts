import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabase, AuthDatabaseLive } from "../src/database/drizzle.js";
import { runAuthMigrations } from "../src/database/migrations.js";
import { readApprovedMigrationDecision } from "./migration-decision.js";

const program = Effect.gen(function* () {
  yield* Effect.sync(readApprovedMigrationDecision);
  const client = yield* PgClient.PgClient;
  const database = yield* AuthDatabase;
  yield* runAuthMigrations(database, client);
  yield* Effect.logInfo("Approved Better Auth 1.7 migration applied");
}).pipe(
  Effect.provide(AuthDatabaseLive),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
