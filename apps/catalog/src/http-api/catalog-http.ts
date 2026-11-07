import { BunHttpServer } from "@effect/platform-bun";
import {
  httpServerMetrics,
  httpServerRouteMetrics,
} from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { CatalogConfig } from "#src/config/catalog-config";
import { CatalogApi } from "./catalog-api.js";
import { CatalogHandlers } from "./catalog-handlers.js";

const DocumentationRoute = HttpRouter.add(
  "GET",
  "/doc",
  HttpServerResponse.raw(
    Bun.file(new URL("../../openapi.yaml", import.meta.url)),
    { contentType: "application/yaml" },
  ),
);

export const CatalogRoutes = Layer.merge(
  HttpApiBuilder.layer(CatalogApi, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(CatalogHandlers),
  ),
  DocumentationRoute,
);

export const CatalogHttpServer = Layer.unwrap(
  Effect.map(CatalogConfig, ({ port }) =>
    HttpRouter.serve(
      CatalogRoutes.pipe(Layer.provide(httpServerRouteMetrics)),
      {
        middleware: httpServerMetrics,
      },
    ).pipe(Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port }))),
  ),
);
