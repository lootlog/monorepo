import { BunHttpServer } from "@effect/platform-bun";
import { httpServerMetrics } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApiHandlers } from "#src/http-api/handlers/handlers-layer";
import { LootlogApi } from "#src/http-api/lootlog-api";
import { ForwardAuthMiddlewareLive } from "#src/http-api/runtime/auth/forward-auth-middleware";
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";
import {
  apiDataLayers,
  apiRequestDataLayers,
} from "#src/http-api/runtime/composition/api-data-layers";
import { OrganizationAuthorizationLayers } from "#src/http-api/runtime/auth/organization-authorization-layers";
import { RequestIdentityLayers } from "#src/http-api/runtime/auth/request-identity-layers";

const HandlerInfrastructure = Layer.mergeAll(
  apiRequestDataLayers,
  OrganizationAuthorizationLayers.pipe(Layer.provide(apiRequestDataLayers)),
  RequestIdentityLayers,
);

const ProcessHandlerInfrastructure = Layer.mergeAll(
  apiDataLayers,
  OrganizationAuthorizationLayers.pipe(Layer.provide(apiDataLayers)),
  RequestIdentityLayers,
);

/**
 * Complete API router without infrastructure implementations.
 *
 * Its remaining Layer requirements are the explicit Data and Authorization
 * ports owned by the 26 handler groups. Keeping them visible prevents the Bun
 * host from starting with a partially wired API.
 */
export const LootlogApiRoutes = HttpApiBuilder.layer(LootlogApi, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide(LootlogApiHandlers),
  Layer.provide(ForwardAuthMiddlewareLive),
);

/** Complete in-process router used by both the Bun server and HTTP integration tests. */
export const LootlogApiRouter = LootlogApiRoutes.pipe(
  Layer.provide(HandlerInfrastructure),
);

export const LootlogApiHttp = HttpRouter.serve(LootlogApiRoutes, {
  middleware: httpServerMetrics,
}).pipe(Layer.provide(ProcessHandlerInfrastructure));

export const ApiHttpServerLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, ({ port }) =>
    LootlogApiHttp.pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port })),
    ),
  ),
);
