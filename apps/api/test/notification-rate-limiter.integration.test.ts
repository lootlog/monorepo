import { setTimeout as sleep } from "node:timers/promises";
import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/unstable/persistence";
import { RedisService } from "#src/redis/redis.service";
import {
  ExecutionError,
  RedlockService,
} from "#src/lib/redlock/redlock.service";
import {
  buildNotificationRateLimitKey,
  consumeNotificationRateLimit,
  NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
  NOTIFICATION_RATE_LIMIT_WINDOW_MS,
  type MessagingRedis,
  type NotificationRateLimitOutcome,
} from "../src/http-api/handlers/messaging/messaging.data-layer.js";

describe("Notification rate limiter Redis integration", () => {
  let firstRedis: RedisService;
  let secondRedis: RedisService;
  let firstLimiter: (userId: string) => Promise<NotificationRateLimitOutcome>;
  let secondLimiter: (userId: string) => Promise<NotificationRateLimitOutcome>;
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;

  const limiter = (redis: RedisService) => {
    const adapter: Pick<MessagingRedis, "eval"> = {
      eval: <A>(
        script: string,
        keys: ReadonlyArray<string>,
        arguments_: ReadonlyArray<string | number>,
      ) =>
        Effect.tryPromise({
          try: () => redis.eval<A>(script, [...keys], [...arguments_]),
          catch: (error) => error,
        }),
    };
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
    firstRedis = new RedisService(redis, {}, (effect) =>
      redisRuntime.runPromise(effect),
    );
    secondRedis = new RedisService(redis, {}, (effect) =>
      redisRuntime.runPromise(effect),
    );
    firstLimiter = limiter(firstRedis);
    secondLimiter = limiter(secondRedis);
  });

  afterAll(async () => {
    await redisRuntime.dispose();
  });

  beforeEach(async () => {
    await firstRedis.flushall();
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
      firstRedis.pttl(buildNotificationRateLimitKey("user-1")),
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
    await firstRedis.pexpire(key, 1);
    await sleep(10);

    await expect(firstLimiter("user-1")).resolves.toEqual({
      accepted: true,
    });
  });

  it("serializes competing lock owners and permits acquisition after release", async () => {
    const firstLocks = new RedlockService(firstRedis).createInstance({
      retryCount: 0,
    });
    const secondLocks = new RedlockService(secondRedis).createInstance({
      retryCount: 0,
    });
    const held = await firstLocks.acquire(["integration:lock"], 5_000);

    await expect(
      secondLocks.acquire(["integration:lock"], 5_000),
    ).rejects.toBeInstanceOf(ExecutionError);

    await held.release();
    const acquired = await secondLocks.acquire(["integration:lock"], 5_000);
    await acquired.release();
  });

  it("does not release a lock after its ownership token changes", async () => {
    const locks = new RedlockService(firstRedis).createInstance({
      retryCount: 0,
    });
    const held = await locks.acquire(["integration:lock"], 5_000);
    await firstRedis.set("integration:lock", "replacement", 5);

    await held.release();

    await expect(firstRedis.get("integration:lock")).resolves.toBe(
      "replacement",
    );
  });
});
