import {
  serviceApiRoutes,
  serviceHttpServer,
} from "@lootlog/instrumentation/service";
import { Effect, Layer } from "effect";
import { SearchConfig } from "#src/config/search-config";
import { SearchApi } from "./search-api.js";
import { SearchHandlers } from "./search-handlers.js";

export const SearchRoutes = serviceApiRoutes(SearchApi, {
  documentation: new URL("../../openapi.yaml", import.meta.url),
}).pipe(Layer.provide(SearchHandlers));

export const SearchHttpServer = Layer.unwrap(
  Effect.map(SearchConfig, ({ port }) =>
    serviceHttpServer({ routes: SearchRoutes, port }),
  ),
).pipe(Layer.provide(SearchConfig.layer));
