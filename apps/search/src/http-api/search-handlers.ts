import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { SearchApi } from "./search-api.js";
import { SearchOperations } from "./search-operations.js";

const operation = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, Effect.die);

export const SearchHandlers = Layer.mergeAll(
  HttpApiBuilder.group(SearchApi, "health", (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () => Effect.void),
  ),
  HttpApiBuilder.group(SearchApi, "Players", (handlers) =>
    handlers.handle("PlayersControllerGetPlayers", ({ query }) =>
      Effect.flatMap(SearchOperations, (search) =>
        operation(search.searchPlayers(query)),
      ),
    ),
  ),
  HttpApiBuilder.group(SearchApi, "NPCs", (handlers) =>
    handlers.handle("NpcsControllerGetNpcs", ({ query }) =>
      Effect.flatMap(SearchOperations, (search) =>
        operation(search.searchNpcs(query)),
      ),
    ),
  ),
  HttpApiBuilder.group(SearchApi, "Items", (handlers) =>
    handlers.handle("ItemsControllerGetItems", ({ query }) =>
      Effect.flatMap(SearchOperations, (search) =>
        operation(search.searchItems(query)),
      ),
    ),
  ),
  HttpApiBuilder.group(SearchApi, "All", (handlers) =>
    handlers.handle("AllControllerSearchAll", ({ query }) =>
      Effect.flatMap(SearchOperations, (search) =>
        operation(search.searchAll(query)),
      ),
    ),
  ),
);
