import { Layer } from "effect";
import { ApiHttpServerLive } from "#src/http-api/runtime/application/http-routes";
import { ApiRedis } from "#src/http-api/runtime/infrastructure/api-redis";
import { ApiRabbitLive } from "#src/http-api/runtime/infrastructure/api-rabbit";
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";
import { ApiLifecycleLive } from "#src/http-api/runtime/application/lifecycle";

const ApiRuntimeDependencies = Layer.merge(ApiRedis.layer, ApiRabbitLive).pipe(
  Layer.provideMerge(ApiRuntimeConfig.layer),
);

/** Complete scoped API process: Bun HTTP, consumers, workers and scheduled jobs. */
export const ApiApplicationLive = Layer.merge(
  ApiLifecycleLive,
  ApiHttpServerLive,
).pipe(Layer.provide(ApiRuntimeDependencies));
