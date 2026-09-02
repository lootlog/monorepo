import { redisStorage } from "@better-auth/redis-storage";
import { Context, Effect, Layer } from "effect";
import { Redis } from "ioredis";
import { AppConfig, reveal } from "#src/config/env";
import { createFailOpenSecondaryStorage } from "./secondary-storage-fail-open.js";

const AUTH_REDIS_KEY_PREFIX = "auth:better-auth:";

const logRedisWarning = (message: string, error: unknown) => {
  Effect.runFork(
    Effect.logWarning(message).pipe(
      Effect.annotateLogs({
        error: error instanceof Error ? error.message : String(error),
      }),
    ),
  );
};

export class AuthRedisStorage extends Context.Service<
  AuthRedisStorage,
  {
    readonly client: Redis;
    readonly secondaryStorage: ReturnType<
      typeof createFailOpenSecondaryStorage
    >;
  }
>()("@lootlog/auth/AuthRedisStorage") {
  static readonly layer = Layer.effect(
    AuthRedisStorage,
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const client = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const redisClient = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            username: config.redis.username,
            password: reveal(config.redis.password),
            connectTimeout: 1_000,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
          });

          redisClient.on("error", (error) => {
            logRedisWarning("Redis client error", error);
          });

          return redisClient;
        }),
        (redisClient) =>
          Effect.sync(() => {
            if (
              redisClient.status !== "end" &&
              redisClient.status !== "close"
            ) {
              redisClient.disconnect(false);
            }
          }),
      );

      const secondaryStorage = createFailOpenSecondaryStorage(
        redisStorage({ client, keyPrefix: AUTH_REDIS_KEY_PREFIX }),
        (operation, error) => {
          logRedisWarning(`Redis secondary storage ${operation} failed`, error);
        },
      );

      return AuthRedisStorage.of({ client, secondaryStorage });
    }),
  );
}
