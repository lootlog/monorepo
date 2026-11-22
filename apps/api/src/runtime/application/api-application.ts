import { Layer } from "effect";
import { ApiHttpServerLive } from "#src/runtime/application/http-routes";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRabbitLive } from "#src/runtime/infrastructure/api-rabbit";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { ApiLifecycleLive } from "#src/runtime/application/lifecycle";

const ApiRuntimeDependencies = Layer.merge(ApiRedis.layer, ApiRabbitLive).pipe(
  Layer.provideMerge(ApiRuntimeConfig.layer),
);

export const ApiApplicationLive = Layer.merge(
  ApiLifecycleLive,
  ApiHttpServerLive,
).pipe(Layer.provide(ApiRuntimeDependencies));
