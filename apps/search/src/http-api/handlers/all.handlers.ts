import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { SearchApi } from "../search-api.js";
import { SearchOperations } from "../search-operations.js";
import { runSearchOperation } from "./operation.js";

export const AllHandlers = HttpApiBuilder.group(SearchApi, "All", (handlers) =>
  handlers.handle("AllControllerSearchAll", ({ query }) =>
    Effect.flatMap(SearchOperations, (search) =>
      runSearchOperation(search.searchAll(query)),
    ),
  ),
);
