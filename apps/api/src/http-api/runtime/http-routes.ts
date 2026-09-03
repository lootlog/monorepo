import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApiHandlers } from "../handlers/handlers-layer.js";
import { LootlogApi } from "../lootlog-api.js";
import { ForwardAuthMiddlewareLive } from "./forward-auth-middleware.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
import {
  NativeApiDataLayers,
  NativeApiRequestDataLayers,
} from "./native-api-data-layers.js";
import { OrganizationAuthorizationLayers } from "./organization-authorization-layers.js";
import { RequestIdentityLayers } from "./request-identity-layers.js";

const HandlerInfrastructure = Layer.mergeAll(
  NativeApiRequestDataLayers,
  OrganizationAuthorizationLayers.pipe(
    Layer.provide(NativeApiRequestDataLayers),
  ),
  RequestIdentityLayers,
);

const ProcessHandlerInfrastructure = Layer.mergeAll(
  NativeApiDataLayers,
  OrganizationAuthorizationLayers.pipe(Layer.provide(NativeApiDataLayers)),
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

export const LootlogApiHttp = HttpRouter.serve(LootlogApiRoutes).pipe(
  Layer.provide(ProcessHandlerInfrastructure),
);

export const ApiHttpServerLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, ({ port }) =>
    LootlogApiHttp.pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port })),
    ),
  ),
);
