import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { CatalogApi } from "../catalog-api.js";
import { CatalogOperations } from "../catalog-operations.js";
import { runSearchOperation } from "@lootlog/meilisearch/search-unavailable";

export const NpcsHandlers = HttpApiBuilder.group(
  CatalogApi,
  "NPCs",
  (handlers) =>
    handlers.handle("NpcsControllerGetNpcs", ({ query }) =>
      Effect.flatMap(CatalogOperations, (catalog) =>
        runSearchOperation(catalog.searchNpcs(query)),
      ),
    ),
);
