import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { OnlineHistory } from "#src/realtime/online-history";
import type { UserOnlineEventV1 } from "@lootlog/protocol/rabbit/events";
import type { SessionData } from "#src/realtime/session";
import { useDragonfly } from "./dragonfly-fixtures.js";
import { makeSession, openStore, recorder } from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: online history", () => {
  useDragonfly();

  test("online history survives publisher restart without counting gaps or web sessions", async () => {
    await using redis = await openStore();
    const { store } = redis;
    const start = Date.parse("2026-09-06T10:00:00Z");
    let now = start;
    const online = recorder<UserOnlineEventV1>();
    let history = new OnlineHistory(store.command, online.publish, () => now);
    const session = makeSession("online-one");
    session.character = session.presence?.character;

    const observeAt = async (seconds: number, final = false) => {
      now = start + seconds * 1000;
      await Effect.runPromise(history.observe(session, now, final));
    };

    const checkpoints = () =>
      online.events.filter((event) => event.type === "checkpoint");

    await observeAt(0);
    await observeAt(25);
    await observeAt(50);
    now = start + 60_000;
    await Effect.runPromise(history.flush);
    expect(checkpoints()).toHaveLength(1);
    expect(checkpoints()[0]?.world).toBe("classic");
    expect(checkpoints()[0]?.endedAt).toBe(
      new Date(start + 50_000).toISOString(),
    );
    await observeAt(75);
    await observeAt(100);
    now = start + 110_000;
    await Effect.runPromise(history.flush);
    expect(checkpoints()).toHaveLength(1);
    now = start + 120_000;
    online.fail = true;
    await expect(Effect.runPromise(history.flush)).rejects.toThrow();
    history = new OnlineHistory(store.command, online.publish, () => now);
    online.fail = false;
    now = start + 180_000;
    await Effect.runPromise(history.flush);
    expect(checkpoints()).toHaveLength(2);
    expect(checkpoints()[1]?.segmentId).toBe(checkpoints()[0]?.segmentId);
    expect(checkpoints()[1]?.endedAt).toBe(
      new Date(start + 100_000).toISOString(),
    );
    await observeAt(200);
    await observeAt(225, true);
    await Effect.runPromise(history.flush);
    expect(checkpoints()).toHaveLength(3);
    expect(checkpoints()[2]?.startedAt).toBe(
      new Date(start + 200_000).toISOString(),
    );
    expect(checkpoints()[2]?.endedAt).toBe(
      new Date(start + 225_000).toISOString(),
    );
    expect(session.guilds).toHaveLength(2);

    const web = {
      ...session,
      platform: "web-app" as const,
      connectionId: "web",
    };

    await Effect.runPromise(history.observe(web, now));
    await Effect.runPromise(history.observe(web, now + 30_000, true));
    now += 120_000;
    await Effect.runPromise(history.observe(session, now, true));
    await Effect.runPromise(history.flush);
    expect(checkpoints()).toHaveLength(3);
    const changedAt = now + 120_000;
    now = changedAt;
    await Effect.runPromise(history.observe(session, now));
    now = changedAt + 25_000;
    await Effect.runPromise(history.observe(session, now));

    if (!session.character) throw new Error("Expected game character");
    session.character = { ...session.character, world: "luvia" };
    now = changedAt + 50_000;
    await Effect.runPromise(history.observe(session, now));
    now = changedAt + 150_000;
    await Effect.runPromise(history.flush);
    expect(
      checkpoints()
        .slice(3)
        .map(({ world, startedAt }) => [world, startedAt]),
    ).toEqual([
      ["classic", new Date(changedAt).toISOString()],
      ["luvia", new Date(changedAt + 25_000).toISOString()],
    ]);
  });

  test("online history drains a bounded backlog and preserves updates during delivery", async () => {
    await using redis = await openStore();
    const { store } = redis;
    const start = Date.parse("2026-09-06T10:00:00Z");
    let now = start;

    const sessions = Array.from({ length: 1250 }, (_, index) => {
      const session = makeSession(`backlog-${index}`);
      session.character = session.presence?.character;

      return session;
    });

    const messages: UserOnlineEventV1[] = [];
    let updatedSession: SessionData | undefined;
    let fail = false;

    const history = new OnlineHistory(
      store.command,
      (event) =>
        Effect.gen(function* () {
          if (fail && event.type === "checkpoint")
            return yield* Effect.fail(new Error("Rabbit unavailable"));
          messages.push(event);

          if (event.type === "checkpoint" && !updatedSession) {
            updatedSession = sessions.find(
              (session) => session.connectionId === event.sessionId,
            );

            if (!updatedSession) throw new Error("Missing session");
            yield* history.observe(updatedSession, start + 55_000);
          }
        }),
      () => now,
    );

    for (const session of sessions) {
      await Effect.runPromise(history.observe(session, start));
      await Effect.runPromise(history.observe(session, start + 50_000));
    }

    const checkpoints = () =>
      messages.filter((event) => event.type === "checkpoint");

    const pending = () =>
      store.command.eval<number>(
        "return redis.call('HLEN', KEYS[1])",
        1,
        "online-history:pending",
      );

    now = start + 60_000;
    await Effect.runPromise(history.flush);
    expect(checkpoints()).toHaveLength(1000);
    expect(new Set(checkpoints().map((event) => event.sessionId)).size).toBe(
      1000,
    );
    expect(await pending()).toBe(251);
    expect(messages.filter((event) => event.type === "collector")).toHaveLength(
      1,
    );
    fail = true;
    await expect(Effect.runPromise(history.flush)).rejects.toThrow(
      "Rabbit unavailable",
    );
    expect(await pending()).toBe(251);
    fail = false;
    now += 60_000;
    await Effect.runPromise(history.flush);
    expect(checkpoints()).toHaveLength(1251);
    expect(new Set(checkpoints().map((event) => event.sessionId)).size).toBe(
      1250,
    );
    expect(await pending()).toBe(0);

    const updated = checkpoints().filter(
      (event) => event.sessionId === updatedSession?.connectionId,
    );

    expect(updated.map((event) => event.endedAt)).toEqual([
      new Date(start + 50_000).toISOString(),
      new Date(start + 55_000).toISOString(),
    ]);
    expect(updated[0]?.segmentId).toBe(updated[1]?.segmentId);
  }, 30_000);

  test.each([
    { delay: 3000, failSecondBatch: true },
    { delay: 5000, failSecondBatch: false },
  ])(
    "online history refreshes batch leases and bounds slow drains (first delivery takes $delay ms, second batch fails: $failSecondBatch)",
    async ({ delay, failSecondBatch }) => {
      await using redis = await openStore();
      const start = Date.parse("2026-09-06T10:00:00Z");
      let now = start;
      const messages: UserOnlineEventV1[] = [];
      let fail = failSecondBatch;
      let attempts = 0;

      const history = new OnlineHistory(
        redis.store.command,
        (event) =>
          Effect.suspend(() => {
            if (event.type === "checkpoint") {
              attempts++;

              if (attempts === 1) now += delay;

              if (fail && attempts === 101)
                return Effect.fail(new Error("Rabbit unavailable"));
            }

            messages.push(event);

            return Effect.void;
          }),
        () => now,
      );

      for (let index = 0; index < 250; index++) {
        const session = makeSession(`slow-${index}`);
        session.character = session.presence?.character;
        await Effect.runPromise(history.observe(session, start));
        await Effect.runPromise(history.observe(session, start + 50_000));
      }

      const checkpoints = () =>
        messages.filter((event) => event.type === "checkpoint");

      now = start + 60_000;

      if (fail)
        await expect(Effect.runPromise(history.flush)).rejects.toThrow(
          "Rabbit unavailable",
        );
      else await Effect.runPromise(history.flush);
      expect(checkpoints()).toHaveLength(100);
      expect(
        messages.filter((event) => event.type === "collector").at(-1)
          ?.observedAt,
      ).toBe(new Date(now).toISOString());
      fail = false;
      now = start + 120_000;
      await Effect.runPromise(history.flush);
      expect(checkpoints()).toHaveLength(failSecondBatch ? 150 : 250);
      now = start + 123_000;
      await Effect.runPromise(history.flush);
      expect(checkpoints()).toHaveLength(250);
      expect(new Set(checkpoints().map((event) => event.sessionId)).size).toBe(
        250,
      );
    },
    30_000,
  );
});
