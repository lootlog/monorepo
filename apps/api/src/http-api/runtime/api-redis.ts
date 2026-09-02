import { RedisService } from "#src/redis/redis.service";
import { Context, Effect, Layer, Redacted } from "effect";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

export class ApiRedis extends Context.Service<ApiRedis, RedisService>()(
  "@lootlog/api/http-api/ApiRedis",
) {
  static readonly layer = Layer.effect(
    ApiRedis,
    Effect.gen(function* () {
      const { redis } = yield* ApiRuntimeConfig;
      return yield* Effect.acquireRelease(
        Effect.sync(() => {
          const service = new RedisService({
            host: redis.host,
            port: redis.port,
            username: redis.username,
            password: Redacted.value(redis.password),
          });
          service.initialize();
          return service;
        }),
        (service) => Effect.sync(() => service.shutdown()),
      );
    }),
  );
}
