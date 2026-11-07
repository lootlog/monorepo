import {
  RuntimeEnvironment,
  RuntimeEnvironmentSchema,
} from "@lootlog/schema/runtime-environment";
import { Config, Context, Effect, Layer, Option, Redacted } from "effect";

export interface CatalogConfigValue {
  readonly environment: RuntimeEnvironment;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly meilisearchHost: string;
  readonly meilisearchApiKey: Redacted.Redacted<string>;
  /** What trusted services, such as the wiki's Worker, present to read. */
  readonly serviceToken: Redacted.Redacted<string>;
}

const LOCAL_SERVICE_TOKEN = "local-development-catalog-service-token";

export class CatalogConfig extends Context.Service<
  CatalogConfig,
  CatalogConfigValue
>()("@lootlog/catalog/CatalogConfig") {
  static readonly layer = Layer.effect(
    CatalogConfig,
    Effect.gen(function* () {
      const environment = yield* Config.schema(
        RuntimeEnvironmentSchema,
        "ENV",
      ).pipe(Config.withDefault(RuntimeEnvironment.LOCAL));

      const configuredToken = yield* Config.option(
        Config.Redacted("CATALOG_SERVICE_TOKEN"),
      );

      const serviceToken = Option.isSome(configuredToken)
        ? configuredToken.value
        : environment === RuntimeEnvironment.LOCAL
          ? Redacted.make(LOCAL_SERVICE_TOKEN)
          : yield* Effect.fail(
              new Error(
                `CATALOG_SERVICE_TOKEN is required when ENV=${environment}`,
              ),
            );

      if (Redacted.value(serviceToken).length < 32)
        return yield* Effect.fail(
          new Error(
            "CATALOG_SERVICE_TOKEN must contain at least 32 characters",
          ),
        );

      return CatalogConfig.of({
        environment,
        port: yield* Config.Int("PORT"),
        serviceName: yield* Config.String("SERVICE_NAME").pipe(
          Config.withDefault("catalog"),
        ),
        serviceNamespace: yield* Config.String("SERVICE_NAMESPACE").pipe(
          Config.withDefault("local"),
        ),
        databaseUrl: yield* Config.Redacted("POSTGRESQL_CONNECTION_URI"),
        rabbitmqUri: yield* Config.Redacted("RABBITMQ_URI"),
        meilisearchHost: yield* Config.String("MEILISEARCH_HOST"),
        meilisearchApiKey: yield* Config.Redacted("MEILISEARCH_API_KEY"),
        serviceToken,
      });
    }),
  );
}
