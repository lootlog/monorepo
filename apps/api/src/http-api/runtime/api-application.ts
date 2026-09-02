import { Layer } from "effect";
import { ApiHttpServerLive } from "./http-routes.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRabbitLive } from "./api-rabbit.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
import { LegacyNestApplicationLive } from "./legacy-nest-application.js";
import { ApiLifecycleLive } from "./lifecycle.js";

const ApiRuntimeDependencies = Layer.merge(
  Layer.merge(ApiRedis.layer, ApiRabbitLive).pipe(
    Layer.provideMerge(ApiRuntimeConfig.layer),
  ),
  LegacyNestApplicationLive,
);

/** Complete scoped API process: Bun HTTP plus transitional application data. */
export const ApiApplicationLive = Layer.merge(
  ApiLifecycleLive,
  ApiHttpServerLive,
).pipe(Layer.provide(ApiRuntimeDependencies));
