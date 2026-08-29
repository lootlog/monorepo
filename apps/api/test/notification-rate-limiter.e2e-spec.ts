import { setTimeout as sleep } from "node:timers/promises";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  buildNotificationRateLimitKey,
  NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
  NOTIFICATION_RATE_LIMIT_WINDOW_MS,
  NotificationRateLimiterService,
} from "../src/messaging/notification-rate-limiter.service.js";

describe("Notification rate limiter Redis integration", () => {
  const logger = { log: vi.fn<(entry: unknown) => void>() };
  let firstRedis: RedisService;
  let secondRedis: RedisService;
  let firstLimiter: NotificationRateLimiterService;
  let secondLimiter: NotificationRateLimiterService;

  beforeAll(() => {
    const options = {
      host: process.env.REDIS_HOST ?? "127.0.0.1",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      username: process.env.REDIS_USERNAME || undefined,
    };
    firstRedis = new RedisService(options);
    secondRedis = new RedisService(options);
    firstRedis.onModuleInit();
    secondRedis.onModuleInit();
    firstLimiter = new NotificationRateLimiterService(
      logger as never,
      firstRedis,
    );
    secondLimiter = new NotificationRateLimiterService(
      logger as never,
      secondRedis,
    );
  });

  afterAll(() => {
    firstRedis.onModuleDestroy();
    secondRedis.onModuleDestroy();
  });

  beforeEach(async () => {
    await firstRedis.getClient().flushall();
    vi.clearAllMocks();
  });

  it("accepts five attempts in 5000 ms and rejects the sixth", async () => {
    const accepted = await Promise.all(
      Array.from({ length: NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS }, () =>
        firstLimiter.consume("user-1"),
      ),
    );

    expect(accepted).toEqual(
      Array.from({ length: NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS }, () => ({
        accepted: true,
      })),
    );
    await expect(firstLimiter.consume("user-1")).resolves.toMatchObject({
      accepted: false,
      retryAfterMs: expect.any(Number),
    });
    await expect(
      firstRedis.getClient().pttl(buildNotificationRateLimitKey("user-1")),
    ).resolves.toBeGreaterThan(0);
    expect(NOTIFICATION_RATE_LIMIT_WINDOW_MS).toBe(5_000);
  });

  it("shares one atomic limit across concurrent API instances", async () => {
    const outcomes = await Promise.all(
      Array.from(
        { length: NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS + 1 },
        (_, index) =>
          (index % 2 === 0 ? firstLimiter : secondLimiter).consume("user-1"),
      ),
    );

    expect(outcomes.filter((outcome) => outcome.accepted)).toHaveLength(5);
    expect(outcomes.filter((outcome) => !outcome.accepted)).toHaveLength(1);
  });

  it("keeps limits independent between users", async () => {
    const outcomes = await Promise.all([
      ...Array.from({ length: 5 }, () => firstLimiter.consume("user-1")),
      ...Array.from({ length: 5 }, () => secondLimiter.consume("user-2")),
    ]);

    expect(outcomes.every((outcome) => outcome.accepted)).toBe(true);
    await expect(firstLimiter.consume("user-1")).resolves.toMatchObject({
      accepted: false,
    });
    await expect(secondLimiter.consume("user-2")).resolves.toMatchObject({
      accepted: false,
    });
  });

  it("accepts another notification after the window expires", async () => {
    await Promise.all(
      Array.from({ length: 5 }, () => firstLimiter.consume("user-1")),
    );
    const key = buildNotificationRateLimitKey("user-1");
    await firstRedis.getClient().pexpire(key, 1);
    await sleep(10);

    await expect(firstLimiter.consume("user-1")).resolves.toEqual({
      accepted: true,
    });
  });
});
