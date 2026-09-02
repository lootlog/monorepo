import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabase } from "../src/database/drizzle.js";
import { planAuthMigration } from "../src/database/migrations.js";
import { readApprovedMigrationDecision } from "./migration-decision.js";

const program = Effect.gen(function* () {
  const decision = yield* Effect.sync(readApprovedMigrationDecision);
  const connection = yield* AuthDatabase;
  const plan = yield* Effect.promise(() => planAuthMigration(connection.pool));

  yield* Effect.sync(() =>
    process.stdout.write(`${JSON.stringify({ decision, plan }, null, 2)}\n`),
  );
}).pipe(
  Effect.provide(AuthDatabase.layer),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
