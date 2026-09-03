import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { SearchApi } from "../search-api.js";
import { SearchOperations } from "../search-operations.js";
import { runSearchOperation } from "./operation.js";

export const NpcsHandlers = HttpApiBuilder.group(
  SearchApi,
  "NPCs",
  (handlers) =>
    handlers.handle("NpcsControllerGetNpcs", ({ query }) =>
      Effect.flatMap(SearchOperations, (search) =>
        runSearchOperation(search.searchNpcs(query)),
      ),
    ),
);
