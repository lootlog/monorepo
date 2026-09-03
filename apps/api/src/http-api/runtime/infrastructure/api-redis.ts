import { BunRedis } from "@effect/platform-bun";
import { RedisService } from "#src/redis/redis.service";
import { Context, Effect, FiberSet, Layer, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";

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
    Effect.map(ApiRuntimeConfig, ({ redis }) =>
      ApiRedis.layerWithoutRedis.pipe(
        Layer.provide(
          BunRedis.layer({
            url: redisUrl(redis),
          }),
        ),
      ),
    ),
  );
}

const redisUrl = (redis: ApiRuntimeConfig["Service"]["redis"]): string => {
  const username = encodeURIComponent(redis.username);
  const password = encodeURIComponent(Redacted.value(redis.password));
  return `redis://${username}:${password}@${redis.host}:${redis.port}`;
};
