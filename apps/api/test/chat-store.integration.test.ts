import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/persistence";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";
import { makeChatRedis } from "#src/runtime/features/chat";
import type { ChatRedis } from "../src/chat/chat.data-layer.js";

describe("Organization chat store Dragonfly integration", () => {
  let redis: RedisService;
  let chat: ChatRedis;
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;

  beforeAll(async () => {
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    redis = makeRedisService(await redisRuntime.runPromise(Redis.Redis));
    chat = makeChatRedis(redis);
  });

  afterAll(async () => {
    await redisRuntime.dispose();
  });

  beforeEach(async () => {
    await redisRuntime.runPromise(
      Effect.flatMap(Redis.Redis, (client) => client.send("FLUSHALL")),
    );
  });

  it("replaces a message by value after a send trims the list, leaving the shifted neighbours intact", async () => {
    const key = "guild:organization:messages";

    await Effect.runPromise(
      Effect.forEach(
        ["a", "gathering", "c"],
        (value) => chat.rpush(key, value),
        {
          discard: true,
        },
      ),
    );
    await Effect.runPromise(chat.rpush(key, "d"));
    await Effect.runPromise(chat.ltrim(key, -3, -1));

    expect(
      await Effect.runPromise(chat.replace(key, "gathering", "ended")),
    ).toBe(true);
    expect(await Effect.runPromise(chat.replace(key, "missing", "x"))).toBe(
      false,
    );
    expect(await Effect.runPromise(chat.lrange(key, 0, -1))).toEqual([
      "ended",
      "c",
      "d",
    ]);
  });
});
