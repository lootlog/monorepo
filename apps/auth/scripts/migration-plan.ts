import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabaseLive } from "../src/database/drizzle.js";
import { planAuthMigration } from "../src/database/migrations.js";
import { readApprovedMigrationDecision } from "./migration-decision.js";

const program = Effect.gen(function* () {
  const decision = yield* Effect.sync(readApprovedMigrationDecision);
  const client = yield* PgClient.PgClient;
  const plan = yield* planAuthMigration(client);

  yield* Effect.sync(() =>
    process.stdout.write(`${JSON.stringify({ decision, plan }, null, 2)}\n`),
  );
}).pipe(
  Effect.provide(AuthDatabaseLive),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
