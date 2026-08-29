import type { Provider } from "@nestjs/common";
import { Meilisearch } from "meilisearch";
import { env } from "#src/config/env";
import { MEILISEARCH_CLIENT } from "./meilisearch.constants.js";

export const meilisearchClientProvider: Provider = {
  provide: MEILISEARCH_CLIENT,
  useFactory: () =>
    new Meilisearch({
      host: env.MEILISEARCH_HOST,
      apiKey: env.MEILISEARCH_API_KEY,
    }),
};
