import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  guilds,
  gameSocket,
  dueDepartures,
  openStore,
  recorder,
  presenceStore,
  interceptScript,
  connect,
  depart,
  OFFLINE_OUTBOX_INDEX,
} from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: presence offline claims", () => {
  useDragonfly();

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
});
