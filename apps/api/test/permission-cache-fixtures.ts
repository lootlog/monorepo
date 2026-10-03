import { Effect, Queue, Schema } from "effect";
import { Redis } from "effect/persistence";
import { RedisService } from "../src/redis/redis.service.js";
import type { InternalGuildsCache } from "../src/http-api/handlers/internal/internal.handlers.js";

// The real RedisService owns generation and single-flight behavior. Only the
// external driver commands and their Lua replies are simulated here.
export const createPermissionCacheBoundary = () => {
  const values = new Map<string, string>();
  let publication: { started: () => void; wait: Promise<void> } | undefined;

  const driver = Redis.Redis.of({
    send: <A>(command: string, ...args: readonly string[]) =>
      Effect.sync(() => {
        const [key = "", value = ""] = args;
        let reply: string | number | null;

        switch (command) {
          case "GET":
            reply = values.get(key) ?? null;
            break;
          case "SET":
            if (args.includes("NX") && values.has(key)) {
              reply = null;
              break;
            }

            values.set(key, value);
            reply = "OK";
            break;
          case "DEL":
            reply = args.reduce(
              (deleted, name) => deleted + Number(values.delete(name)),
              0,
            );
            break;
          default:
            throw new Error(`Unexpected Redis command: ${command}`);
        }

        // SAFETY: These branches implement the Redis command replies selected by RedisService.
        return reply as A;
      }),
    subscribe: () => Queue.unbounded(),
    eval:
      (script) =>
      (...parameters) =>
        Effect.promise(async () => {
          const count = script.numberOfKeys(...parameters);

          const arguments_ = Schema.decodeUnknownSync(
            Schema.Array(Schema.String),
          )(parameters);

          const keys = arguments_.slice(0, count);
          const args = arguments_.slice(count);

          if (script.lua.includes("local versions = {}")) {
            return keys.map((key, index) => {
              const generation = values.get(key) ?? args[index];

              if (generation === undefined)
                throw new Error("Missing generation");
              values.set(key, generation);

              return generation;
            });
          }

          const [key] = keys;

          if (key === undefined) throw new Error("Missing script key");

          if (values.get(key) !== args[0]) return 0;

          if (script.lua.includes('redis.call("SET", KEYS[2]')) {
            const paused = publication;
            publication = undefined;
            paused?.started();
            await paused?.wait;
            const destination = keys[1];
            const payload = args[1];

            if (destination === undefined || payload === undefined) {
              throw new Error("Missing cache publication arguments");
            }

            values.set(destination, payload);

            return 1;
          }

          if (script.lua.includes('redis.call("del", KEYS[1])')) {
            return Number(values.delete(key));
          }

          throw new Error("Unexpected Redis script");
        }),
  });

  const redis = new RedisService(driver, {}, Effect.runPromise);

  const cache = {
    get: (key: string) => Effect.promise(() => redis.get(key)),
    set: (key: string, value: string, ttl: number) =>
      Effect.promise(() => redis.set(key, value, ttl)),
    del: (key: string) =>
      Effect.promise(() => redis.del(key)).pipe(Effect.asVoid),
    getOrSetJsonEffect: redis.getOrSetJsonEffect.bind(redis),
  } satisfies InternalGuildsCache;

  return {
    redis,
    cache,
    pauseNextPublication: () => {
      const started = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      publication = { started: started.resolve, wait: release.promise };

      return { started: started.promise, release: release.resolve };
    },
  };
};
