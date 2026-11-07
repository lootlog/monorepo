import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { CatalogApi } from "../catalog-api.js";
import { CatalogOperations } from "../catalog-operations.js";
import { runSearchOperation } from "@lootlog/meilisearch/search-unavailable";

export const CatalogHandlers = HttpApiBuilder.group(
  CatalogApi,
  "Catalog",
  (handlers) =>
    handlers
      .handle("CatalogControllerGetItems", ({ query }) =>
        Effect.flatMap(CatalogOperations, (catalog) =>
          runSearchOperation(catalog.catalogItems(query)),
        ),
      )
      .handle("CatalogControllerGetNpcs", ({ query }) =>
        Effect.flatMap(CatalogOperations, (catalog) =>
          runSearchOperation(catalog.catalogNpcs(query)),
        ),
      )
      .handle("CatalogControllerGetEvents", ({ query }) =>
        Effect.flatMap(CatalogOperations, (catalog) =>
          runSearchOperation(catalog.catalogEvents(query)),
        ),
      )
      .handle("CatalogControllerGetIndex", ({ query }) =>
        Effect.flatMap(CatalogOperations, (catalog) =>
          runSearchOperation(catalog.catalogIndex(query)),
        ),
      ),
);
