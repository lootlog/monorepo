import { makePostgresLayer } from "@lootlog/database";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer } from "effect";
import { databaseUrlConfig } from "#src/config/api.config";

export type ApiDatabaseValue = Omit<
  Effect.Success<ReturnType<typeof makeWithDefaults>>,
  "$client"
>;

export class ApiDatabase extends Context.Service<
  ApiDatabase,
  ApiDatabaseValue
>()("@lootlog/api/ApiDatabase") {
  static readonly layer = Layer.effect(ApiDatabase, makeWithDefaults());
}

const PgClientLive = Layer.unwrap(
  databaseUrlConfig.pipe(
    Effect.map((url) =>
      makePostgresLayer({
        url,
        applicationName: "lootlog-api",
        // Most columns are `timestamp` without a zone and hold UTC; `now()`
        // defaults and comparisons with `timestamptz` columns follow the
        // session zone.
        startupParameters: { timezone: "UTC" },
      }),
    ),
  ),
);

/** A scoped PostgreSQL client together with the Effect-native Drizzle service. */
export const ApiDatabaseLive = ApiDatabase.layer.pipe(
  Layer.provideMerge(PgClientLive),
);
