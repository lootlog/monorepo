import { SchemaErrorResponseLive } from "#src/http-api/schema-error-response";
import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { serviceHttpServer } from "@lootlog/instrumentation/service";
import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApiHandlers } from "#src/http-api/handlers/handlers-layer";
import { LootlogApi } from "#src/http-api/lootlog-api";
import { ForwardAuthMiddlewareLive } from "#src/runtime/auth/forward-auth-middleware";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import {
  apiDataLayers,
  apiRequestDataLayers,
} from "#src/runtime/api-data-layers";
import { OrganizationAuthorizationLayers } from "#src/runtime/auth/organization-authorization-layers";
import { RequestIdentityLayers } from "#src/runtime/auth/request-identity-layers";

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
const LootlogApiRoutes = HttpApiBuilder.layer(LootlogApi, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide(LootlogApiHandlers),
  Layer.provide(ForwardAuthMiddlewareLive),
  Layer.provide(apiKeyEndpointPolicyLayer("main")),
  Layer.provide(SchemaErrorResponseLive),
);

/** Complete in-process router used by both the Bun server and HTTP integration tests. */
export const LootlogApiRouter = LootlogApiRoutes.pipe(
  Layer.provideMerge(HandlerInfrastructure),
);

export const ApiHttpServerLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, ({ port }) =>
    serviceHttpServer({ routes: LootlogApiRoutes, port }).pipe(
      Layer.provide(ProcessHandlerInfrastructure),
    ),
  ),
);
