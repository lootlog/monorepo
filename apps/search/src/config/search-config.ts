import { Config, Context, Effect, Layer } from "effect";

export interface SearchConfigValue {
  readonly port: number;
  readonly serviceName: string;
  readonly meilisearchHost: string;
  readonly meilisearchApiKey: string;
  readonly rabbitmqUri: string;
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
        meilisearchApiKey: Config.string("MEILISEARCH_API_KEY"),
        rabbitmqUri: Config.string("RABBITMQ_URI"),
      });
      return SearchConfig.of(value);
    }),
  );
}
