import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { setTimeout as sleep } from "node:timers/promises";
import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/persistence";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";
import { ExecutionError, makeRedisLockManager } from "#src/redis/redlock";
import {
  buildNotificationRateLimitKey,
  consumeNotificationRateLimit,
  NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
  NOTIFICATION_RATE_LIMIT_WINDOW_MS,
  type MessagingRedis,
  type NotificationRateLimitOutcome,
} from "../src/messaging/messaging.data-layer.js";

describe("Notification rate limiter Dragonfly integration", () => {
  let firstRedis: RedisService;
  let secondRedis: RedisService;
  let firstLimiter: (userId: string) => Promise<NotificationRateLimitOutcome>;
  let secondLimiter: (userId: string) => Promise<NotificationRateLimitOutcome>;
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;

  const send = <A>(command: string, ...args: string[]) =>
    redisRuntime.runPromise(
      Effect.flatMap(Redis.Redis, (client) => client.send<A>(command, ...args)),
    );

  const limiter = (redis: RedisService) => {
    const adapter: Pick<MessagingRedis, "eval"> = { eval: redis.eval };

    return (userId: string) =>
      Effect.runPromise(consumeNotificationRateLimit(adapter, userId));
  };

  beforeAll(async () => {
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    const redis = await redisRuntime.runPromise(Redis.Redis);
    firstRedis = makeRedisService(redis);
    secondRedis = makeRedisService(redis);
    firstLimiter = limiter(firstRedis);
    secondLimiter = limiter(secondRedis);
  });

  afterAll(async () => {
    await redisRuntime.dispose();
  });

  beforeEach(async () => {
    await send("FLUSHALL");
  });

  it("accepts five attempts in 5000 ms and rejects the sixth", async () => {
    const accepted = await Promise.all(
      Array.from({ length: NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS }, () =>
        firstLimiter("user-1"),
      ),
    );

    expect(accepted).toEqual(
      Array.from({ length: NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS }, () => ({
        accepted: true,
      })),
    );
    await expect(firstLimiter("user-1")).resolves.toMatchObject({
      accepted: false,
      retryAfterMs: expect.any(Number),
    });
    await expect(
      send<number>("PTTL", buildNotificationRateLimitKey("user-1")),
    ).resolves.toBeGreaterThan(0);
    expect(NOTIFICATION_RATE_LIMIT_WINDOW_MS).toBe(5_000);
  });

  it("shares one atomic limit across concurrent API instances", async () => {
    const outcomes = await Promise.all(
      Array.from(
        { length: NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS + 1 },
        (_, index) =>
          (index % 2 === 0 ? firstLimiter : secondLimiter)("user-1"),
      ),
    );

    expect(outcomes.filter((outcome) => outcome.accepted)).toHaveLength(5);
    expect(outcomes.filter((outcome) => !outcome.accepted)).toHaveLength(1);
  });

  it("keeps limits independent between users", async () => {
    const outcomes = await Promise.all([
      ...Array.from({ length: 5 }, () => firstLimiter("user-1")),
      ...Array.from({ length: 5 }, () => secondLimiter("user-2")),
    ]);

    expect(outcomes.every((outcome) => outcome.accepted)).toBe(true);
    await expect(firstLimiter("user-1")).resolves.toMatchObject({
      accepted: false,
    });
    await expect(secondLimiter("user-2")).resolves.toMatchObject({
      accepted: false,
    });
  });

  it("accepts another notification after the window expires", async () => {
    await Promise.all(Array.from({ length: 5 }, () => firstLimiter("user-1")));
    const key = buildNotificationRateLimitKey("user-1");
    await send("PEXPIRE", key, "1");
    await sleep(10);

    await expect(firstLimiter("user-1")).resolves.toEqual({
      accepted: true,
    });
  });

  it("serializes competing lock owners and permits acquisition after release", async () => {
    const firstLocks = makeRedisLockManager(firstRedis, { retryCount: 0 });
    const secondLocks = makeRedisLockManager(secondRedis, { retryCount: 0 });

    const held = await Effect.runPromise(
      firstLocks.acquire(["integration:lock"], 5_000),
    );

    await expect(
      Effect.runPromise(secondLocks.acquire(["integration:lock"], 5_000)),
    ).rejects.toBeInstanceOf(ExecutionError);

    await Effect.runPromise(held.release);

    const acquired = await Effect.runPromise(
      secondLocks.acquire(["integration:lock"], 5_000),
    );

    await Effect.runPromise(acquired.release);
  });

  it("does not release a lock after its ownership token changes", async () => {
    const locks = makeRedisLockManager(firstRedis, { retryCount: 0 });

    const held = await Effect.runPromise(
      locks.acquire(["integration:lock"], 5_000),
    );

    await Effect.runPromise(
      firstRedis.set("integration:lock", "replacement", 5),
    );

    await Effect.runPromise(held.release);

    await expect(
      Effect.runPromise(firstRedis.get("integration:lock")),
    ).resolves.toBe("replacement");
  });
});
