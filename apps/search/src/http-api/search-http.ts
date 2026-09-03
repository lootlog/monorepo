import { BunHttpServer } from "@effect/platform-bun";
import { httpServerMetrics } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { SearchConfig } from "#src/config/search-config";
import { SearchApi } from "./search-api.js";
import { SearchHandlers } from "./search-handlers.js";

// oxlint-disable-next-line react-hooks/rules-of-hooks -- Effect router constructor, not React.
const DocumentationRoute = HttpRouter.use((router) =>
  router.add(
    "GET",
    "/doc",
    HttpServerResponse.raw(
      Bun.file(new URL("../../openapi.yaml", import.meta.url)),
      {
        contentType: "application/yaml",
      },
    ),
  ),
);

export const SearchRoutes = Layer.merge(
  HttpApiBuilder.layer(SearchApi, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(SearchHandlers),
  ),
  DocumentationRoute,
);

export const SearchHttpServer = Layer.unwrap(
  Effect.map(SearchConfig, ({ port }) =>
    HttpRouter.serve(SearchRoutes, { middleware: httpServerMetrics }).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port })),
    ),
  ),
).pipe(Layer.provide(SearchConfig.layer));
