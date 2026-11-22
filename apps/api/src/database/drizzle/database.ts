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
        startupParameters: { timezone: "UTC" },
      }),
    ),
  ),
);

export const ApiDatabaseLive = ApiDatabase.layer.pipe(
  Layer.provideMerge(PgClientLive),
);
