import { makePostgresLayer } from "@lootlog/database";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer } from "effect";
import { CatalogConfig } from "#src/config/catalog-config";

export type CatalogDatabaseValue = Effect.Success<
  ReturnType<typeof makeWithDefaults>
>;

export class CatalogDatabase extends Context.Service<
  CatalogDatabase,
  CatalogDatabaseValue
>()("@lootlog/catalog/CatalogDatabase") {
  static readonly layer = Layer.effect(CatalogDatabase, makeWithDefaults());
}

export const PgClientLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* CatalogConfig;

    return makePostgresLayer({
      url: config.databaseUrl,
      applicationName: config.serviceName,
    });
  }),
).pipe(Layer.provide(CatalogConfig.layer));
