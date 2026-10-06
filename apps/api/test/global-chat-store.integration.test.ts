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
import { GLOBAL_CHAT_MESSAGE_LIMIT } from "@lootlog/schema/chat";
import { RedisService } from "#src/redis/redis.service";
import { makeGlobalChatStore } from "#src/runtime/features/global-chat";
import type { GlobalChatStore } from "#src/http-api/handlers/global-chat/global-chat.data-layer";

describe("Global chat store Dragonfly integration", () => {
  let redis: RedisService;
  let store: GlobalChatStore;
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;

  const appendAll = (values: ReadonlyArray<string>) =>
    Effect.runPromise(
      Effect.forEach(values, (value) => store.append(value), { discard: true }),
    );

  const page = (before: number | undefined, count: number) =>
    Effect.runPromise(store.page(before, count));

  beforeAll(async () => {
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    redis = new RedisService(
      await redisRuntime.runPromise(Redis.Redis),
      {},
      (effect) => redisRuntime.runPromise(effect),
    );
    store = makeGlobalChatStore(redis);
  });

  afterAll(async () => {
    await redisRuntime.dispose();
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  it("reads newest first and keeps a cursor stable while messages arrive", async () => {
    await appendAll(["a", "b", "c", "d"]);

    const newest = await page(undefined, 2);
    await appendAll(["e"]);
    const older = await page(newest.at(-1)?.position, 2);

    expect(newest.map(({ value }) => value)).toEqual(["d", "c"]);
    expect(older.map(({ value }) => value)).toEqual(["b", "a"]);
  });

  it("keeps only the newest messages up to the retention limit", async () => {
    await appendAll(
      Array.from(
        { length: GLOBAL_CHAT_MESSAGE_LIMIT + 3 },
        (_, index) => `message-${index}`,
      ),
    );

    const kept = await page(undefined, GLOBAL_CHAT_MESSAGE_LIMIT + 10);

    expect(kept).toHaveLength(GLOBAL_CHAT_MESSAGE_LIMIT);
    expect(kept.at(-1)?.value).toBe("message-3");
  });

  it("admits one send per User within the cooldown", async () => {
    const acquire = (userId: string) =>
      Effect.runPromise(store.acquireSendSlot(userId));

    expect(await acquire("user-1")).toBe(true);
    expect(await acquire("user-1")).toBe(false);
    expect(await acquire("user-2")).toBe(true);
  });
});
