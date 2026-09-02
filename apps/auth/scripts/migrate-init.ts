import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabase } from "../src/database/drizzle.js";
import { initializeAuthMigrations } from "../src/database/migrations.js";

const program = Effect.gen(function* () {
  const connection = yield* AuthDatabase;
  yield* Effect.promise(() => initializeAuthMigrations(connection.pool));
  yield* Effect.logInfo("Auth migrations initialized");
}).pipe(
  Effect.provide(AuthDatabase.layer),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
