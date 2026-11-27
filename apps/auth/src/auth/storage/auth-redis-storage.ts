import { reconnectingBunRedisLayer } from "@lootlog/database/bun-redis";
import { reveal } from "#src/config/env";
import type { SecondaryStorage } from "better-auth";
import {
  Context,
  Effect,
  FiberSet,
  Layer,
  Schema,
  type Redacted,
} from "effect";
import { Redis } from "effect/persistence";
import { createFailOpenSecondaryStorage } from "./secondary-storage-fail-open.js";
import type { RefreshCoordination } from "#src/auth/provider/discord-token-refresh";

const secondaryStorageKey = (key: string) => `auth:better-auth:${key}`;

const refreshCoordinationKey = (key: string) => `auth:${key}`;

const decodeStoredValue = Schema.decodeUnknownSync(
  Schema.NullOr(Schema.String),
);

export const createAuthRedisConnection = (url: Redacted.Redacted<string>) =>
  reconnectingBunRedisLayer({
    url: reveal(url),
    connectionTimeout: 1_000,
    enableOfflineQueue: true,
    maxRetries: 1,
  });

export interface ApiKeyRateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
}

export class AuthRedisStorage extends Context.Service<
  AuthRedisStorage,
  {
    readonly consumeApiKeyRateLimit: (
      keyId: string,
    ) => Effect.Effect<ApiKeyRateLimitDecision, Redis.RedisError>;
    readonly secondaryStorage: ReturnType<
      typeof createFailOpenSecondaryStorage
    >;
    readonly refreshCoordination: RefreshCoordination;
  }
>()("@lootlog/auth/AuthRedisStorage") {
  static readonly layer = Layer.effect(
    AuthRedisStorage,
    Effect.gen(function* () {
      const redis = yield* Redis.Redis;
      const fibers = yield* FiberSet.make<unknown, unknown>();
      const runPromise = yield* FiberSet.runtimePromise(fibers)<never>();

      const run = <A>(effect: Effect.Effect<A, Redis.RedisError>) =>
        runPromise(effect);

      const logRedisWarning = (message: string, cause: unknown) => {
        void runPromise(
          Effect.logWarning(message).pipe(
            Effect.annotateLogs({
              error: cause instanceof Error ? cause.message : String(cause),
            }),
          ),
        );
      };

      const storage: SecondaryStorage = {
        get: (key) => run(redis.send("GET", secondaryStorageKey(key))),
        getAndDelete: (key) =>
          run(redis.send("GETDEL", secondaryStorageKey(key))),
        increment: (key, ttl) =>
          run(
            redis.eval(incrementScript)(secondaryStorageKey(key), String(ttl)),
          ),
        set: (key, value, ttl) =>
          ttl !== undefined && ttl > 0
            ? run(
                redis.send(
                  "SET",
                  secondaryStorageKey(key),
                  value,
                  "EX",
                  String(ttl),
                ),
              ).then(() => undefined)
            : run(redis.send("SET", secondaryStorageKey(key), value)).then(
                () => undefined,
              ),
        delete: (key) =>
          run(redis.send("DEL", secondaryStorageKey(key))).then(
            () => undefined,
          ),
      };

      const secondaryStorage = createFailOpenSecondaryStorage(
        storage,
        (operation, error) => {
          logRedisWarning(`Redis secondary storage ${operation} failed`, error);
        },
      );

      const refreshCoordination: RefreshCoordination = {
        claim: (key, ttlMs) =>
          run(
            redis.send(
              "SET",
              refreshCoordinationKey(key),
              "1",
              "NX",
              "PX",
              String(ttlMs),
            ),
          ).then((reply) => reply === "OK"),
        release: (key) =>
          run(redis.send("DEL", refreshCoordinationKey(key))).then(
            () => undefined,
          ),
        read: (key) =>
          run(redis.send("GET", refreshCoordinationKey(key))).then(
            decodeStoredValue,
          ),
        publish: (key, value, ttlSeconds) =>
          run(
            redis.send(
              "SET",
              refreshCoordinationKey(key),
              value,
              "EX",
              String(ttlSeconds),
            ),
          ).then(() => undefined),
      };

      return AuthRedisStorage.of({
        secondaryStorage,
        refreshCoordination,
        consumeApiKeyRateLimit: (keyId) =>
          redis
            .eval(rateLimitScript)(`auth:api-key-rate-limit:${keyId}`, "60")
            .pipe(
              Effect.map(([count, ttlMs]) => ({
                allowed: count <= 120,
                retryAfterMs: Math.max(ttlMs, 0),
              })),
            ),
      });
    }),
  );
}

const INCREMENT_SCRIPT = `
local value = redis.call("INCR", KEYS[1])
if value == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return value
`;

const incrementScript = Redis.script((key: string, ttl: string) => [key, ttl], {
  lua: INCREMENT_SCRIPT,
  numberOfKeys: 1,
}).withReturnType<number>();

const RATE_LIMIT_SCRIPT = `
local value = redis.call("INCR", KEYS[1])
if value == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return { value, redis.call("PTTL", KEYS[1]) }
`;

const rateLimitScript = Redis.script((key: string, ttl: string) => [key, ttl], {
  lua: RATE_LIMIT_SCRIPT,
  numberOfKeys: 1,
}).withReturnType<readonly [number, number]>();
