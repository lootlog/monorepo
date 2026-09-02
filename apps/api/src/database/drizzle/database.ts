import { PgClient } from "@effect/sql-pg";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Config, Context, Effect, Layer } from "effect";

export type ApiDatabaseValue = Effect.Success<
  ReturnType<typeof makeWithDefaults>
>;

export class ApiDatabase extends Context.Service<
  ApiDatabase,
  ApiDatabaseValue
>()("@lootlog/api/ApiDatabase") {
  static readonly layer = Layer.effect(ApiDatabase, makeWithDefaults());
}

export const PgClientLive = Layer.unwrap(
  Config.redacted("POSTGRESQL_CONNECTION_URI").pipe(
    Effect.map((url) =>
      PgClient.layer({
        url,
        applicationName: "lootlog-api",
      }),
    ),
  ),
);

/** A scoped PostgreSQL client together with the Effect-native Drizzle service. */
export const ApiDatabaseLive = ApiDatabase.layer.pipe(
  Layer.provideMerge(PgClientLive),
);
