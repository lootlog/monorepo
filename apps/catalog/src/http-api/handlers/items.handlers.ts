import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { CatalogApi } from "../catalog-api.js";
import { CatalogOperations } from "../catalog-operations.js";
import { runSearchOperation } from "@lootlog/meilisearch/search-unavailable";

export const ItemsHandlers = HttpApiBuilder.group(
  CatalogApi,
  "Items",
  (handlers) =>
    handlers.handle("ItemsControllerGetItems", ({ query }) =>
      Effect.flatMap(CatalogOperations, (catalog) =>
        runSearchOperation(catalog.searchItems(query)),
      ),
    ),
);
