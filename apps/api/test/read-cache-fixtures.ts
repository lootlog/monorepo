import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime, Schema } from "effect";
import { Redis } from "effect/persistence";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";

type Entry = { key: string; scopes: readonly string[] };

export const makeReadCacheFixture = () => {
  let cache: RedisService;

  const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
  const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");

  const runtime = ManagedRuntime.make(
    BunRedis.layer({
      url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
    }),
  );

  const codec = makeJsonCodec(
    Schema.NullOr(Schema.Struct({ value: Schema.Finite })),
  );

  const organization = crypto.randomUUID();
  const prefix = `cache-test-${organization}`;

  const fromPromise = <A>(factory: () => Promise<A>) =>
    Effect.tryPromise({ try: factory, catch: (error) => error });

  const send = <A>(command: string, key: string, ...args: string[]) =>
    runtime.runPromise(
      Effect.flatMap(Redis.Redis, (client) =>
        client.send<A>(command, `${prefix}:${key}`, ...args),
      ),
    );

  const pttl = (key: string) => send<number>("PTTL", key);

  const pexpire = (key: string, milliseconds: number) =>
    send<number>("PEXPIRE", key, String(milliseconds));

  const write = (entry: Entry, value: number) =>
    Effect.runPromise(
      cache.getOrSetJson({
        ...entry,
        codec,
        ttlSeconds: 30,
        factory: Effect.succeed({ value }),
      }),
    );

  const read = (entry: Entry) =>
    Effect.runPromise(
      cache.getOrSetJson({
        ...entry,
        codec,
        ttlSeconds: 30,
        factory: Effect.succeed(null),
      }),
    );

  const connect = async () => {
    cache = makeRedisService(await runtime.runPromise(Redis.Redis), { prefix });

    return cache;
  };

  const close = () => runtime.dispose();

  return {
    runtime,
    codec,
    organization,
    prefix,
    fromPromise,
    pttl,
    pexpire,
    write,
    read,
    connect,
    close,
  };
};
