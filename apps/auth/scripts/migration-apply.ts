import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabase } from "../src/database/drizzle.js";
import { runAuthMigrations } from "../src/database/migrations.js";
import { readApprovedMigrationDecision } from "./migration-decision.js";

const program = Effect.gen(function* () {
  yield* Effect.sync(readApprovedMigrationDecision);
  const connection = yield* AuthDatabase;
  yield* Effect.promise(() => runAuthMigrations(connection));
  yield* Effect.logInfo("Approved Better Auth 1.7 migration applied");
}).pipe(
  Effect.provide(AuthDatabase.layer),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
