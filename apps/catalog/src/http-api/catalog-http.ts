import {
  serviceApiRoutes,
  serviceHttpServer,
} from "@lootlog/instrumentation/service";
import { SchemaErrorResponseLive } from "@lootlog/protocol/http/schema-error-response";
import { Effect, Layer } from "effect";
import { CatalogConfig } from "#src/config/catalog-config";
import { CatalogApi } from "./catalog-api.js";
import { CatalogHandlers } from "./catalog-handlers.js";

export const CatalogRoutes = serviceApiRoutes(CatalogApi, {
  documentation: new URL("../../openapi.yaml", import.meta.url),
}).pipe(Layer.provide(CatalogHandlers), Layer.provide(SchemaErrorResponseLive));

export const CatalogHttpServer = Layer.unwrap(
  Effect.map(CatalogConfig, ({ port }) =>
    serviceHttpServer({ routes: CatalogRoutes, port }),
  ),
);
