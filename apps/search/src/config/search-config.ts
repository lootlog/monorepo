import { Config, Context, Effect, Layer, type Redacted } from "effect";

export interface SearchConfigValue {
  readonly environment: string;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly meilisearchHost: string;
  readonly meilisearchApiKey: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
}

export class SearchConfig extends Context.Service<
  SearchConfig,
  SearchConfigValue
>()("@lootlog/search/SearchConfig") {
  static readonly layer = Layer.effect(
    SearchConfig,
    Effect.gen(function* () {
      const value = yield* Config.all({
        environment: Config.String("ENV").pipe(Config.withDefault("local")),
        port: Config.Int("PORT"),
        serviceName: Config.String("SERVICE_NAME").pipe(
          Config.withDefault("search"),
        ),
        serviceNamespace: Config.String("SERVICE_NAMESPACE").pipe(
          Config.withDefault("local"),
        ),
        meilisearchHost: Config.String("MEILISEARCH_HOST"),
        meilisearchApiKey: Config.Redacted("MEILISEARCH_API_KEY"),
        rabbitmqUri: Config.Redacted("RABBITMQ_URI"),
      });

      return SearchConfig.of(value);
    }),
  );
}
