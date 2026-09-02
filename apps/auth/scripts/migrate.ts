import { Effect } from "effect";
import { AppConfig } from "../src/config/env.js";
import { AuthDatabase } from "../src/database/drizzle.js";
import { runAuthMigrations } from "../src/database/migrations.js";

const program = Effect.gen(function* () {
  const connection = yield* AuthDatabase;
  yield* Effect.promise(() => runAuthMigrations(connection));
  yield* Effect.logInfo("Auth migrations applied");
}).pipe(
  Effect.provide(AuthDatabase.layer),
  Effect.provide(AppConfig.layer),
  Effect.scoped,
);

await Effect.runPromise(program);
