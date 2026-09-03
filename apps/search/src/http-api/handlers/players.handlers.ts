import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { SearchApi } from "../search-api.js";
import { SearchOperations } from "../search-operations.js";
import { runSearchOperation } from "./operation.js";

export const PlayersHandlers = HttpApiBuilder.group(
  SearchApi,
  "Players",
  (handlers) =>
    handlers.handle("PlayersControllerGetPlayers", ({ query }) =>
      Effect.flatMap(SearchOperations, (search) =>
        runSearchOperation(search.searchPlayers(query)),
      ),
    ),
);
