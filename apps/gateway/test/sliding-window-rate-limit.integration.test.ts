import { describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import { dragonflyUrl, useDragonfly } from "./dragonfly-fixtures.js";

describe("realtime Dragonfly integration: sliding window rate limit", () => {
  useDragonfly();

  test.each([
    { refreshExpiryOnReject: false, includeTimestamp: false },
    { refreshExpiryOnReject: true, includeTimestamp: false },
    { refreshExpiryOnReject: true, includeTimestamp: true },
  ])(
    "sliding-window limits preserve expiry and Redis time (%j)",
    async (options) => {
      const client = new RedisClient(dragonflyUrl());
      const key = `sliding-window:${crypto.randomUUID()}`;
      const script = slidingWindowRateLimitScript(options);
      const window = 60_000;

      try {
        const seededAt = Number(
          await client.send("EVAL", [
            `local time = redis.call("TIME")
         local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
         redis.call("ZADD", KEYS[1], now - 60000, "expired", now, "active")
         return now`,
            "1",
            key,
          ]),
        );

        const accepted = await client.send("EVAL", [
          script,
          "1",
          key,
          String(window),
          "2",
          "accepted",
        ]);

        expect(accepted).toEqual(
          options.includeTimestamp ? [1, expect.any(Number), 0] : [1, 0],
        );
        expect(await client.send("ZRANGE", [key, "0", "-1"])).toEqual(
          expect.arrayContaining(["active", "accepted"]),
        );
        expect(Number(await client.send("PTTL", [key]))).toBeGreaterThan(
          59_000,
        );

        await client.send("PEXPIRE", [key, "50000"]);

        const rejected = await client.send("EVAL", [
          script,
          "1",
          key,
          String(window),
          "2",
          "rejected",
        ]);

        expect(rejected).toEqual(
          options.includeTimestamp
            ? [0, expect.any(Number), expect.any(Number)]
            : [0, expect.any(Number)],
        );

        if (!Array.isArray(rejected))
          throw new Error("Expected rate-limit tuple");
        const retryAfter = Number(rejected.at(-1));
        expect(retryAfter).toBeGreaterThan(59_000);
        expect(retryAfter).toBeLessThanOrEqual(window);

        if (options.includeTimestamp) {
          expect(Number(rejected[1])).toBeGreaterThanOrEqual(seededAt);
          expect(Number(rejected[1]) + retryAfter).toBe(seededAt + window);
        }

        expect(await client.send("ZCARD", [key])).toBe(2);
        const ttl = Number(await client.send("PTTL", [key]));

        if (options.refreshExpiryOnReject) expect(ttl).toBeGreaterThan(59_000);
        else expect(ttl).toBeLessThanOrEqual(50_000);
      } finally {
        await client.send("DEL", [key]);
        client.close();
      }
    },
  );
});
