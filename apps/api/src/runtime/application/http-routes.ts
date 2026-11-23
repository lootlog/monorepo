import { SchemaErrorResponseLive } from "@lootlog/protocol/http/schema-error-response";
import { apiKeyEndpointPolicyLayer } from "@lootlog/protocol/http/api-key-http";
import { serviceHttpServer } from "@lootlog/instrumentation/service";
import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApiHandlers } from "#src/http-api/handlers/handlers-layer";
import { LootlogApi } from "#src/http-api/lootlog-api";
import { ForwardAuthMiddlewareLive } from "#src/runtime/auth/forward-auth-middleware";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { makeApiRpcRoutes, makeApiRpcServer } from "#src/rpc/api-rpc-server";
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

const LootlogApiRoutes = HttpApiBuilder.layer(LootlogApi, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide(LootlogApiHandlers),
  Layer.provide(ForwardAuthMiddlewareLive),
  Layer.provide(apiKeyEndpointPolicyLayer("main")),
  Layer.provide(SchemaErrorResponseLive),
);

export const LootlogApiRouter = LootlogApiRoutes.pipe(
  Layer.provideMerge(HandlerInfrastructure),
);

export const ApiRpcRouter = makeApiRpcRoutes(LootlogApiRoutes).pipe(
  Layer.provideMerge(HandlerInfrastructure),
);

export const ApiHttpServerLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, ({ port }) =>
    Layer.merge(
      serviceHttpServer({ routes: LootlogApiRoutes, port }),
      makeApiRpcServer(LootlogApiRoutes),
    ).pipe(Layer.provide(ProcessHandlerInfrastructure)),
  ),
);
