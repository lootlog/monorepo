import { Layer } from "effect";
import { ApiHttpServerLive } from "./http-routes.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRabbitLive } from "./api-rabbit.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
import { ApiLifecycleLive } from "./lifecycle.js";

const ApiRuntimeDependencies = Layer.merge(ApiRedis.layer, ApiRabbitLive).pipe(
  Layer.provideMerge(ApiRuntimeConfig.layer),
);

/** Complete scoped API process: Bun HTTP, consumers, workers and scheduled jobs. */
export const ApiApplicationLive = Layer.merge(
  ApiLifecycleLive,
  ApiHttpServerLive,
).pipe(Layer.provide(ApiRuntimeDependencies));
