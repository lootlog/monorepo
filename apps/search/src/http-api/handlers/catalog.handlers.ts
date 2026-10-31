import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { SearchApi } from "../search-api.js";
import { SearchOperations } from "../search-operations.js";
import { runSearchOperation } from "./operation.js";

export const CatalogHandlers = HttpApiBuilder.group(
  SearchApi,
  "Catalog",
  (handlers) =>
    handlers
      .handle("CatalogControllerGetItems", ({ query }) =>
        Effect.flatMap(SearchOperations, (search) =>
          runSearchOperation(search.catalogItems(query)),
        ),
      )
      .handle("CatalogControllerGetNpcs", ({ query }) =>
        Effect.flatMap(SearchOperations, (search) =>
          runSearchOperation(search.catalogNpcs(query)),
        ),
      ),
);
