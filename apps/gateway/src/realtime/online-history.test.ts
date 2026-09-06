import { expect, test } from "bun:test";
import { Effect } from "effect";
import type { UserOnlineEventV1 } from "@lootlog/protocol/rabbit/events";
import { OnlineHistory } from "./online-history.js";

test("a Redis outage reports degraded health through Rabbit without flooding it", async () => {
  const events: UserOnlineEventV1[] = [];
  let now = Date.parse("2026-09-06T12:00:00Z");
  const history = new OnlineHistory(
    { eval: async () => Promise.reject(new Error("Redis unavailable")) },
    (event) =>
      Effect.sync(() => {
        events.push(event);
      }),
    () => now,
  );

  expect(
    (await Effect.runPromise(history.flush().pipe(Effect.result)))._tag,
  ).toBe("Failure");
  expect(events).toEqual([
    {
      version: 1,
      type: "collector",
      observedAt: new Date(now).toISOString(),
      status: "degraded",
    },
  ]);
  now += 5_000;
  await Effect.runPromise(history.flush().pipe(Effect.result));
  expect(events).toHaveLength(1);
  now += 55_000;
  await Effect.runPromise(history.flush().pipe(Effect.result));
  expect(events).toHaveLength(2);
});
