import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { SearchApi } from "../search-api.js";
import { SearchOperations } from "../search-operations.js";
import { runSearchOperation } from "./operation.js";

export const ItemsHandlers = HttpApiBuilder.group(
  SearchApi,
  "Items",
  (handlers) =>
    handlers.handle("ItemsControllerGetItems", ({ query }) =>
      Effect.flatMap(SearchOperations, (search) =>
        runSearchOperation(search.searchItems(query)),
      ),
    ),
);
