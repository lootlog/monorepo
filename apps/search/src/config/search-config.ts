import {
  type BaseServiceConfiguration,
  baseServiceConfig,
} from "@lootlog/instrumentation/service-config";
import { Config, Context, Effect, Layer, type Redacted } from "effect";

export interface SearchConfigValue extends BaseServiceConfiguration {
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
      const { base, ...search } = yield* Config.all({
        base: baseServiceConfig("search"),
        meilisearchHost: Config.String("MEILISEARCH_HOST"),
        meilisearchApiKey: Config.Redacted("MEILISEARCH_API_KEY"),
        rabbitmqUri: Config.Redacted("RABBITMQ_URI"),
      });

      return SearchConfig.of({ ...base, ...search });
    }),
  );
}
