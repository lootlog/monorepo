import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import {
  OFFLINE_OUTBOX_INDEX,
  connect,
  depart,
  dueDepartures,
  gameSocket,
  guilds,
  interceptScript,
  makeSession,
  presenceHub,
  presenceStore,
  recorder,
  useDragonfly,
} from "./realtime-redis.integration.fixtures.js";

describe("realtime Dragonfly integration: offline claims", () => {
  const { openStore } = useDragonfly();

  test("offline claims serialize with reconnect and retain expired-session delivery through a restart", async () => {
    await using redis = await openStore();
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const claims = interceptScript(
      redis.store.command,
      "-- presence:offline-claim",
    );

    const makePresence = () =>
      presenceStore({
        redis: { command: claims.command },
        now: () => now,
        publishOffline: offline.publish,
      });

    let presence = makePresence();
    const game = gameSocket("offline");
    await connect(presence, game);
    await depart(presence, game);
    now += 10_000;
    claims.before = () => connect(presence, game);

    await Effect.runPromise(presence.sweepOffline);
    expect(claims.results).toHaveLength(1);
    expect(offline.events).toEqual([]);
    expect(
      await redis.store.command.smembers(
        `presence:offline:character:${JSON.stringify([game.data.userId, game.data.character?.world, game.data.character?.characterId])}`,
      ),
    ).toEqual([]);

    for (const { guild } of game.data.guilds)
      await redis.store.command.del(
        `presence:${guild.id}:${game.data.connectionId}`,
      );
    now += PRESENCE_EXPIRY_MS + 10_000;
    presence = makePresence();
    await Effect.runPromise(presence.sweepExpired);
    offline.fail = true;
    await Effect.runPromise(presence.sweepOffline.pipe(Effect.flip));
    presence = makePresence();
    offline.fail = false;
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toHaveLength(1);
    expect(offline.events[0]?.characterId).toBe(
      game.data.character?.characterId,
    );
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toHaveLength(1);
  });

  test("offline decisions reread a later Organization group after a reconnect delayed by publication", async () => {
    await using redis = await openStore();
    const reconnectStored = Promise.withResolvers<void>();
    const resumeReconnect = Promise.withResolvers<void>();
    let reconnecting: Promise<unknown> | undefined;

    try {
      let now = Date.now();
      let pauseReconnect = false;
      const offline = recorder<GameCharacterOffline>();

      const claims = interceptScript(
        redis.store.command,
        "-- presence:offline-claim",
      );

      const command = {
        ...claims.command,
        smembers: async (key: string) => {
          if (pauseReconnect && key.startsWith("presence:offline:character:")) {
            pauseReconnect = false;
            reconnectStored.resolve();
            await resumeReconnect.promise;
          }

          return redis.store.command.smembers(key);
        },
      };

      const presence = presenceStore({
        redis: { command },
        now: () => now,
        publishOffline: offline.publish,
      });

      const first = gameSocket("group-first", {
        memberships: guilds.slice(0, 1),
      });

      const second = gameSocket("group-second");

      for (const socket of [first, second]) {
        await connect(presence, socket);
        await depart(presence, socket);
      }

      now += 10_000;
      const pending = await dueDepartures(redis.store);

      const firstKey = pending.find((key) =>
        key.includes('"user-group-first"'),
      );

      const secondKey = pending.find((key) =>
        key.includes('"user-group-second"'),
      );

      if (!firstKey || !secondKey)
        throw new Error("Missing pending departures");
      claims.after = async () => {
        pauseReconnect = true;
        reconnecting = connect(presence, second);
        await reconnectStored.promise;
        expect(
          await redis.store.command.get("presence:organization-1:group-second"),
        ).not.toBeNull();
        expect(await redis.store.command.get(secondKey)).not.toBeNull();
      };

      await Effect.runPromise(presence.sweepOffline);
      expect(offline.events.map((event) => event.userId)).toEqual([
        first.data.userId,
      ]);
      expect(await dueDepartures(redis.store)).toEqual([]);
      expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual(
        [],
      );
    } finally {
      resumeReconnect.resolve();
      await reconnecting;
    }
  });

  test("offline grouped claims preserve replacement departures and reconnect cancellation for each character", async () => {
    await using redis = await openStore();
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const claims = interceptScript(
      redis.store.command,
      "-- presence:offline-claim",
    );

    const presence = presenceStore({
      redis: { command: claims.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const departed = gameSocket("departed");
    const reconnected = gameSocket("reconnected");

    const replacement = gameSocket("replacement", {
      memberships: [...guilds].reverse(),
    });

    for (const socket of [departed, reconnected, replacement]) {
      await connect(presence, socket);
      await depart(presence, socket);
    }

    now += 10_000;
    const pending = await dueDepartures(redis.store);

    const replacementKey = pending.find((key) =>
      key.includes('"user-replacement"'),
    );

    if (!replacementKey) throw new Error("Missing replacement departure");

    claims.before = async () => {
      await connect(presence, reconnected);
      await connect(presence, replacement);
      await depart(presence, replacement);
    };

    claims.after = () => connect(presence, departed);

    await Effect.runPromise(presence.sweepOffline);
    expect(claims.results).toEqual([1]);
    expect(offline.events.map((event) => event.userId)).toEqual([
      departed.data.userId,
    ]);
    expect(await redis.store.command.get(replacementKey)).toBeNull();
    expect(await dueDepartures(redis.store)).toEqual([
      expect.stringContaining('"user-replacement"'),
    ]);

    now += 10_000;
    await depart(presence, departed);
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events.map((event) => event.userId)).toEqual([
      departed.data.userId,
      replacement.data.userId,
    ]);
    now += 10_000;
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events.map((event) => event.userId)).toEqual([
      departed.data.userId,
      replacement.data.userId,
      departed.data.userId,
    ]);
  });

  test("a later exit of a character supersedes its pending departure and an earlier one cannot replace it", async () => {
    await using redis = await openStore();
    const start = Date.now();
    let now = start;
    const offline = recorder<GameCharacterOffline>();

    const presence = presenceStore({
      redis: redis.store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const lagging = presenceStore({
      redis: redis.store,
      now: () => now - 5_000,
      publishOffline: offline.publish,
    });

    const [firstTab, secondTab, laggingTab] = [
      "first-tab",
      "second-tab",
      "lagging-tab",
    ].map((id) => gameSocket(id, { user: "player", character: "hero" }));

    if (!firstTab || !secondTab || !laggingTab)
      throw new Error("Missing game tabs");
    await connect(presence, firstTab, secondTab);
    await connect(lagging, laggingTab);
    await depart(presence, firstTab);
    now += 5_000;
    await depart(presence, secondTab);
    await depart(lagging, laggingTab);
    expect(await dueDepartures(redis.store)).toHaveLength(1);

    now = start + 10_000;
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([]);

    now = start + 15_000;
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([
      expect.objectContaining({
        userId: "user-player",
        disconnectedAt: start + 5_000,
      }),
    ]);
  });

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
});
