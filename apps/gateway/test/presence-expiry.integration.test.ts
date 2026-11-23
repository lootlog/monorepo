import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  uniquePrefix,
  guilds,
  makeSession,
  gameSocket,
  dueDepartures,
  openStore,
  recorder,
  presenceHub,
  presenceStore,
  interceptScript,
  connect,
  depart,
} from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: presence expiry", () => {
  useDragonfly();

  test("heartbeats repair a lost Organization index and preserve the final observed expiry time", async () => {
    await using redis = await openStore();
    const { store } = redis;
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const presence = presenceStore({
      redis: store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const game = gameSocket("heartbeat");
    await connect(presence, game);

    await store.command.del("presence:index:organization-1");
    now += 25_000;
    await Effect.runPromise(presence.heartbeat(game, game.data.connectionId));
    expect(
      await store.command.smembers("presence:index:organization-1"),
    ).toContain("presence:organization-1:heartbeat");
    expect(
      (await Effect.runPromise(presence.snapshot(game.data, "organization-1")))
        .presences[0]?.lastSeen,
    ).toBe(now);

    await store.command.flushdb();
    now += 25_000;
    await Effect.runPromise(presence.heartbeat(game, game.data.connectionId));
    expect(
      (await Effect.runPromise(presence.snapshot(game.data, "organization-1")))
        .presences,
    ).toHaveLength(1);
    const lastSeen = now;

    for (const { guild } of guilds)
      await store.command.del(`presence:${guild.id}:heartbeat`);
    now += PRESENCE_EXPIRY_MS + 10_000;
    await Effect.runPromise(presence.sweepExpired);
    expect(
      await store.command.smembers("presence:index:organization-1"),
    ).toEqual([]);
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([
      expect.objectContaining({
        disconnectedAt: lastSeen + PRESENCE_EXPIRY_MS,
      }),
    ]);
  });

  test("an idle expiry sweep reads no payloads and a burst expires in bounded reads", async () => {
    await using redis = await openStore();
    let now = Date.now();
    let removed = 0;
    const payloadReads: number[] = [];

    const presence = presenceStore({
      redis: {
        command: {
          ...redis.store.command,
          mget: (keys) => {
            payloadReads.push(keys.length);

            return redis.store.command.mget(keys);
          },
        },
      },
      hub: presenceHub(async (...[, event]) => {
        if (event.type === "presence.delta")
          removed += event.data.changes.filter(
            ({ action }) => action === "remove",
          ).length;
      }),
      now: () => now,
    });

    const sweep = async () => {
      await Effect.runPromise(presence.sweepExpired);
      await Effect.runPromise(presence.flushDeltas);
    };

    for (let index = 0; index < 205; index++)
      await connect(
        presence,
        gameSocket(`burst-${index}`, { memberships: guilds.slice(0, 1) }),
      );

    await Effect.runPromise(presence.flushDeltas);
    await sweep();
    expect(payloadReads).toEqual([]);
    expect(removed).toBe(0);

    now += PRESENCE_EXPIRY_MS;
    await sweep();
    expect(payloadReads.length).toBeGreaterThan(0);
    expect(Math.max(...payloadReads)).toBeLessThanOrEqual(200);
    expect(removed).toBe(205);
    expect(
      (
        await Effect.runPromise(
          presence.snapshot(makeSession("burst-viewer"), "organization-1"),
        )
      ).presences,
    ).toEqual([]);

    await sweep();
    expect(removed).toBe(205);
  });

  test("an expired session's departure replaces an older pending exit of the same character", async () => {
    await using redis = await openStore();
    const start = Date.now();
    let now = start;
    const offline = recorder<GameCharacterOffline>();

    const presence = presenceStore({
      redis: redis.store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const abandoned = gameSocket("abandoned", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    const exited = gameSocket("exited", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    await connect(presence, abandoned, exited);
    now += 1_000;
    await depart(presence, exited);

    const [olderExit] = await dueDepartures(redis.store);

    if (!olderExit) throw new Error("Missing pending exit");

    now = start + PRESENCE_EXPIRY_MS;
    await Effect.runPromise(presence.sweepExpired);
    expect(await redis.store.command.get(olderExit)).toBeNull();
    const departures = await dueDepartures(redis.store);

    expect(departures).toHaveLength(1);
    expect(departures).not.toContain(olderExit);

    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([]);

    now += 10_000;
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([
      expect.objectContaining({
        userId: "user-player",
        disconnectedAt: start + PRESENCE_EXPIRY_MS,
      }),
    ]);
  });

  test("an expiry captured before another exit of its character is scheduled retries instead of adding a second departure", async () => {
    await using redis = await openStore();
    const start = Date.now();
    let now = start;
    const offline = recorder<GameCharacterOffline>();

    const removals = interceptScript(
      redis.store.command,
      "-- presence:expiry-remove",
    );

    const presence = presenceStore({
      redis: { command: removals.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const abandoned = gameSocket("abandoned", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    const active = gameSocket("active", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    await connect(presence, abandoned, active);
    now = start + PRESENCE_EXPIRY_MS;
    await Effect.runPromise(
      presence.heartbeat(active, active.data.connectionId),
    );

    removals.before = async () => {
      now += 1_000;
      await depart(presence, active);
    };

    await Effect.runPromise(presence.sweepExpired);
    expect(removals.results).toEqual([0]);
    expect(await dueDepartures(redis.store)).toHaveLength(1);

    await Effect.runPromise(presence.sweepExpired);
    expect(removals.results).toEqual([0, 1]);
    expect(await dueDepartures(redis.store)).toHaveLength(1);

    now += 10_000;
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([
      expect.objectContaining({
        userId: "user-player",
        disconnectedAt: start + PRESENCE_EXPIRY_MS + 1_000,
      }),
    ]);
  });

  test("two expiry replicas retain a session refreshed after candidate capture", async () => {
    const keyPrefix = uniquePrefix();
    await using firstRedis = await openStore(keyPrefix);
    await using secondRedis = await openStore(keyPrefix);
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();
    let removed = 0;
    const game = gameSocket("expiry-race", { memberships: guilds.slice(0, 1) });
    const organizationId = "organization-1";
    const key = `presence:${organizationId}:${game.data.connectionId}`;
    const metadataKey = `presence:metadata:${organizationId}:${game.data.connectionId}`;
    const dueMember = JSON.stringify([organizationId, game.data.connectionId]);

    const hub = () =>
      presenceHub(async (...[, event]) => {
        if (
          event.type === "presence.delta" &&
          event.data.changes.some(({ action }) => action === "remove")
        )
          removed++;
      });

    const removals = interceptScript(
      firstRedis.store.command,
      "-- presence:expiry-remove",
    );

    const first = presenceStore({
      redis: { command: removals.command },
      hub: hub(),
      now: () => now,
      publishOffline: offline.publish,
    });

    const second = presenceStore({
      redis: secondRedis.store,
      hub: hub(),
      now: () => now,
      publishOffline: offline.publish,
    });

    const flushBoth = () =>
      Effect.runPromise(Effect.all([first.flushDeltas, second.flushDeltas]));

    await connect(first, game);
    await flushBoth();
    now += PRESENCE_EXPIRY_MS;

    removals.before = async () => {
      await Effect.runPromise(second.sweepExpired);
      await Effect.runPromise(second.heartbeat(game, game.data.connectionId));
    };

    await Effect.runPromise(first.sweepExpired);
    await Effect.runPromise(second.sweepExpired);
    now += 10_000;
    await Effect.runPromise(second.sweepOffline);
    await flushBoth();
    expect(removals.results).toEqual([0]);
    expect(removed).toBe(0);
    expect(offline.events).toEqual([]);
    expect(
      (await Effect.runPromise(second.snapshot(game.data, organizationId)))
        .presences,
    ).toEqual([expect.objectContaining({ sessionId: "expiry-race" })]);
    expect(
      Number(
        await secondRedis.store.command.eval(
          "return redis.call('ZSCORE', KEYS[1], ARGV[1])",
          1,
          "presence:expiry:due",
          dueMember,
        ),
      ),
    ).toBe(now - 10_000 + PRESENCE_EXPIRY_MS);

    now += PRESENCE_EXPIRY_MS;
    await Effect.runPromise(second.sweepExpired);
    await Effect.runPromise(first.sweepExpired);
    await Effect.runPromise(first.sweepOffline);
    await flushBoth();
    expect(await firstRedis.store.command.get(key)).toBeNull();
    expect(await firstRedis.store.command.get(metadataKey)).toBeNull();
    expect(removed).toBe(1);
    expect(offline.events).toHaveLength(1);
    expect(offline.events[0]?.disconnectedAt).toBe(now - 10_000);
  });
});
