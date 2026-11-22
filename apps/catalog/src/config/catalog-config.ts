import {
  type BaseServiceConfiguration,
  baseServiceConfig,
  InvalidServiceConfiguration,
  commaSeparatedConfig,
} from "@lootlog/instrumentation/service-config";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, Context, Effect, Layer, Option, Redacted } from "effect";

export interface CatalogConfigValue extends BaseServiceConfiguration {
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly meilisearchHost: string;
  readonly meilisearchApiKey: Redacted.Redacted<string>;
  /** What trusted services, such as the wiki's Worker, present to read. */
  readonly serviceToken: Redacted.Redacted<string>;
  /** Internal User ids allowed to review reports about catalog entries. */
  readonly moderatorUserIds: ReadonlyArray<string>;
}

const LOCAL_SERVICE_TOKEN = "local-development-catalog-service-token";

export class CatalogConfig extends Context.Service<
  CatalogConfig,
  CatalogConfigValue
>()("@lootlog/catalog/CatalogConfig") {
  static readonly layer = Layer.effect(
    CatalogConfig,
    Effect.gen(function* () {
      const base = yield* baseServiceConfig("catalog");

      const configuredToken = yield* Config.option(
        Config.Redacted("CATALOG_SERVICE_TOKEN"),
      );

      const serviceToken = Option.isSome(configuredToken)
        ? configuredToken.value
        : base.environment === RuntimeEnvironment.LOCAL
          ? Redacted.make(LOCAL_SERVICE_TOKEN)
          : yield* new InvalidServiceConfiguration({
              message: `CATALOG_SERVICE_TOKEN is required when ENV=${base.environment}`,
            });

      if (Redacted.value(serviceToken).length < 32)
        return yield* new InvalidServiceConfiguration({
          message: "CATALOG_SERVICE_TOKEN must contain at least 32 characters",
        });

      return CatalogConfig.of({
        ...base,
        databaseUrl: yield* Config.Redacted("POSTGRESQL_CONNECTION_URI"),
        rabbitmqUri: yield* Config.Redacted("RABBITMQ_URI"),
        meilisearchHost: yield* Config.String("MEILISEARCH_HOST"),
        meilisearchApiKey: yield* Config.Redacted("MEILISEARCH_API_KEY"),
        serviceToken,
        moderatorUserIds: yield* commaSeparatedConfig(
          "CATALOG_MODERATOR_USER_IDS",
        ).pipe(Config.withDefault([])),
      });
    }),
  );
}
