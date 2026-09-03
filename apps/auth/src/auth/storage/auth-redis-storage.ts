import type { SecondaryStorage } from "better-auth";
import { Context, Effect, FiberSet, Layer } from "effect";
import { Redis } from "effect/unstable/persistence";
import { createFailOpenSecondaryStorage } from "./secondary-storage-fail-open.js";

const AUTH_REDIS_KEY_PREFIX = "auth:better-auth:";

export class AuthRedisStorage extends Context.Service<
  AuthRedisStorage,
  {
    readonly client: RealtimeTicketRedis;
    readonly secondaryStorage: ReturnType<
      typeof createFailOpenSecondaryStorage
    >;
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
      const logRedisWarning = (message: string, error: unknown) => {
        void runPromise(
          Effect.logWarning(message).pipe(
            Effect.annotateLogs({
              error: error instanceof Error ? error.message : String(error),
            }),
          ),
        );
      };
      const client: RealtimeTicketRedis = {
        set: (key, value, mode, ttl, condition) =>
          run(redis.send("SET", key, value, mode, String(ttl), condition)),
        getdel: (key) => run(redis.send("GETDEL", key)),
      };
      const storage: SecondaryStorage = {
        get: (key) => run(redis.send("GET", `${AUTH_REDIS_KEY_PREFIX}${key}`)),
        getAndDelete: (key) =>
          run(redis.send("GETDEL", `${AUTH_REDIS_KEY_PREFIX}${key}`)),
        increment: (key, ttl) =>
          run(
            redis.eval(incrementScript)(
              `${AUTH_REDIS_KEY_PREFIX}${key}`,
              String(ttl),
            ),
          ),
        set: (key, value, ttl) =>
          ttl !== undefined && ttl > 0
            ? run(
                redis.send(
                  "SET",
                  `${AUTH_REDIS_KEY_PREFIX}${key}`,
                  value,
                  "EX",
                  String(ttl),
                ),
              ).then(() => undefined)
            : run(
                redis.send("SET", `${AUTH_REDIS_KEY_PREFIX}${key}`, value),
              ).then(() => undefined),
        delete: (key) =>
          run(redis.send("DEL", `${AUTH_REDIS_KEY_PREFIX}${key}`)).then(
            () => undefined,
          ),
      };

      const secondaryStorage = createFailOpenSecondaryStorage(
        storage,
        (operation, error) => {
          logRedisWarning(`Redis secondary storage ${operation} failed`, error);
        },
      );

      return AuthRedisStorage.of({ client, secondaryStorage });
    }),
  );
}

interface RealtimeTicketRedis {
  readonly set: (
    key: string,
    value: string,
    mode: "EX",
    ttl: number,
    condition: "NX",
  ) => Promise<unknown>;
  readonly getdel: (key: string) => Promise<string | null>;
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
