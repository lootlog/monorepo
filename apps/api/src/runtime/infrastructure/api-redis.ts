import { reconnectingBunRedisLayer } from "@lootlog/database/bun-redis";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";
import { Context, Effect, Layer, Redacted } from "effect";
import { Redis } from "effect/persistence";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export class ApiRedis extends Context.Service<ApiRedis, RedisService>()(
  "@lootlog/api/http-api/ApiRedis",
) {
  static readonly layerWithoutRedis = Layer.effect(
    ApiRedis,
    Effect.map(Redis.Redis, (redis) => makeRedisService(redis)),
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
