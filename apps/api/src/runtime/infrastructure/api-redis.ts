import { reconnectingBunRedisLayer } from "@lootlog/database/bun-redis";
import { RedisService } from "#src/redis/redis.service";
import { Context, Effect, FiberSet, Layer, Redacted } from "effect";
import { Redis } from "effect/persistence";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export class ApiRedis extends Context.Service<ApiRedis, RedisService>()(
  "@lootlog/api/http-api/ApiRedis",
) {
  static readonly layerWithoutRedis = Layer.effect(
    ApiRedis,
    Effect.gen(function* () {
      const redis = yield* Redis.Redis;
      const fibers = yield* FiberSet.make<unknown, unknown>();
      const runPromise = yield* FiberSet.runtimePromise(fibers)<never>();

      return new RedisService(redis, {}, runPromise);
    }),
  );

  static readonly layer = Layer.unwrap(
    Effect.map(ApiRuntimeConfig, ({ redisUrl }) =>
      ApiRedis.layerWithoutRedis.pipe(
        Layer.provide(
          reconnectingBunRedisLayer({ url: Redacted.value(redisUrl) }),
        ),
      ),
    ),
  );
}
