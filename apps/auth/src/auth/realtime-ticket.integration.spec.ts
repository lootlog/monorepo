import { expect, test } from "bun:test";
import { Redis } from "ioredis";
import {
  consumeRealtimeTicket,
  issueRealtimeTicket,
} from "./realtime-ticket.js";

const redisPort = Number(process.env.LOOTLOG_REALTIME_TEST_REDIS_PORT ?? 0);
const integrationTest = redisPort > 0 ? test : test.skip;
const keyPattern = "auth:realtime-ticket:*";

integrationTest(
  "real Redis enforces realtime ticket reuse, origin and expiry",
  async () => {
    const redis = new Redis({
      host: "127.0.0.1",
      port: redisPort,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    try {
      const existingKeys = await redis.keys(keyPattern);
      if (existingKeys.length > 0) await redis.del(...existingKeys);

      const first = await issueRealtimeTicket(
        redis,
        { userId: "user-1", discordId: "discord-1" },
        "https://classic.margonem.pl",
      );
      await expect(
        consumeRealtimeTicket(
          redis,
          first.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toEqual({ userId: "user-1", discordId: "discord-1" });
      await expect(
        consumeRealtimeTicket(
          redis,
          first.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toBeNull();

      const wrongOrigin = await issueRealtimeTicket(
        redis,
        { userId: "user-1", discordId: "discord-1" },
        "https://classic.margonem.pl",
      );
      await expect(
        consumeRealtimeTicket(
          redis,
          wrongOrigin.ticket,
          "https://attacker.example",
        ),
      ).resolves.toBeNull();
      await expect(
        consumeRealtimeTicket(
          redis,
          wrongOrigin.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toBeNull();

      const expiring = await issueRealtimeTicket(
        redis,
        { userId: "user-1", discordId: "discord-1" },
        "https://classic.margonem.pl",
      );
      const [expiringKey] = await redis.keys(keyPattern);
      if (!expiringKey) throw new Error("Expected persisted realtime ticket");
      await redis.pexpire(expiringKey, 50);
      await Bun.sleep(80);
      await expect(
        consumeRealtimeTicket(
          redis,
          expiring.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toBeNull();
    } finally {
      const keys = await redis.keys(keyPattern);
      if (keys.length > 0) await redis.del(...keys);
      await redis.quit();
    }
  },
);
