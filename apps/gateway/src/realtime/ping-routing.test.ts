import { Effect } from "effect";
import { describe, expect, test } from "bun:test";
import type { RedisScriptReply } from "#src/platform/redis-store";
import { relayWithRateLimit } from "./ping-routing.js";

const ACCEPTED = { status: "accepted", pingId: "ping-1" } as const;

const UNAVAILABLE = {
  status: "rejected",
  code: "temporarily-unavailable",
} as const;

describe("relayWithRateLimit", () => {
  test.each([
    {
      name: "publishes an admitted relay at the time Redis recorded it",
      reply: () => Promise.resolve<RedisScriptReply>([1, 4321, 0]),
      publishFails: false,
      expected: ACCEPTED,
      publishedAt: [4321],
    },
    {
      name: "tells a rate-limited sender when to retry without publishing",
      reply: () => Promise.resolve<RedisScriptReply>([0, 4321, 5000]),
      publishFails: false,
      expected: {
        status: "rejected",
        code: "rate-limited",
        retryAfterMs: 5000,
      },
      publishedAt: [],
    },
    {
      name: "fails closed when Redis cannot run the script",
      reply: () => Promise.reject(new Error("Redis unavailable")),
      publishFails: false,
      expected: UNAVAILABLE,
      publishedAt: [],
    },
    {
      name: "fails closed when Redis returns something other than a tuple",
      reply: () => Promise.resolve<RedisScriptReply>("OK"),
      publishFails: false,
      expected: UNAVAILABLE,
      publishedAt: [],
    },
    {
      name: "tells the sender a relay was not delivered when publishing fails",
      reply: () => Promise.resolve<RedisScriptReply>([1, 4321, 0]),
      publishFails: true,
      expected: UNAVAILABLE,
      publishedAt: [4321],
    },
  ])("$name", async ({ reply, publishFails, expected, publishedAt }) => {
    const published: number[] = [];

    const result = await Effect.runPromise(
      relayWithRateLimit({
        redis: { command: { eval: reply } },
        context: "ping-routing.test",
        rateLimit: {
          key: "ping:rate:user-1",
          windowMs: 10_000,
          limit: 5,
          pingId: "ping-1",
        },
        publish: (createdAt) => {
          published.push(createdAt);

          return publishFails
            ? Promise.reject(new Error("Federation unavailable"))
            : Promise.resolve();
        },
        failure: "Failed to relay test ping",
        accepted: ACCEPTED,
      }),
    );

    expect(result).toEqual(expected);
    expect(published).toEqual([...publishedAt]);
  });
});
