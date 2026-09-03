import { Config, Context, Effect, Layer, type Redacted } from "effect";

export interface SearchConfigValue {
  readonly port: number;
  readonly serviceName: string;
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
        port: Config.int("PORT"),
        serviceName: Config.string("SERVICE_NAME").pipe(
          Config.withDefault("search"),
        ),
        meilisearchHost: Config.string("MEILISEARCH_HOST"),
        meilisearchApiKey: Config.redacted("MEILISEARCH_API_KEY"),
        rabbitmqUri: Config.redacted("RABBITMQ_URI"),
      });
      return SearchConfig.of(value);
    }),
  );
}
