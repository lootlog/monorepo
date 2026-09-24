import { Config, Effect, Redacted } from "effect";
import { Meilisearch } from "meilisearch";
import { backfillNpcCatalogKeys } from "#src/npcs/npc-catalog-backfill";

const config = await Effect.runPromise(
  Config.all({
    host: Config.String("MEILISEARCH_HOST"),
    apiKey: Config.Redacted("MEILISEARCH_API_KEY"),
  }),
);

const result = await Effect.runPromise(
  backfillNpcCatalogKeys(
    new Meilisearch({
      host: config.host,
      apiKey: Redacted.value(config.apiKey),
    }),
  ),
);

console.log(JSON.stringify(result));

if (!result.complete)
  console.log(
    "Run backfill:npc-catalog again before enabling the new search service.",
  );
