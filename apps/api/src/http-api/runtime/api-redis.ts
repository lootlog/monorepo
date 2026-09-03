import { BunRedis } from "@effect/platform-bun";
import { RedisService } from "#src/redis/redis.service";
import { Context, Effect, Layer, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

export class ApiRedis extends Context.Service<ApiRedis, RedisService>()(
  "@lootlog/api/http-api/ApiRedis",
) {
  static readonly layerWithoutRedis = Layer.effect(
    ApiRedis,
    Effect.gen(function* () {
      const redis = yield* Redis.Redis;
      return new RedisService(redis, {}, Effect.runPromise);
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
