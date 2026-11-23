import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  guilds,
  makeSocket,
  gameSocket,
  OFFLINE_DUE_INDEX,
  dueDepartures,
  openStore,
  recorder,
  presenceStore,
  interceptScript,
  connect,
  OFFLINE_OUTBOX_INDEX,
} from "./realtime-redis-fixtures.js";

const addDueDepartures = (store: RedisGatewayStore, ...keys: string[]) =>
  store.command.eval(
    "for _, member in ipairs(ARGV) do redis.call('ZADD', KEYS[1], 0, member) end return 1",
    1,
    OFFLINE_DUE_INDEX,
    ...keys,
  );

const departure = (
  name: string,
  disconnectedAt: number,
): GameCharacterOffline => ({
  userId: `user-${name}`,
  discordId: `discord-${name}`,
  characterId: `character-${name}`,
  world: "classic",
  organizationIds: ["organization-1"],
  disconnectedAt,
});

const OFFLINE_SWEEP_LOCK = "presence:offline:sweep-lock";

const takeOverOfflineSweep = async (store: RedisGatewayStore) => {
  await store.command.set(OFFLINE_SWEEP_LOCK, "successor", "PX", 30_000);
};

describe("realtime Dragonfly integration: presence offline sweeps", () => {
  useDragonfly();

  test("an expired sweeper lease cannot recreate a departure already delivered by its successor", async () => {
    await using redis = await openStore();
    const { store } = redis;
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const successor = presenceStore({
      redis: store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const game = gameSocket("lost-expiry-lease", {
      memberships: guilds.slice(0, 1),
    });

    await connect(successor, game);
    now += PRESENCE_EXPIRY_MS + 10_000;
    let transferred = false;

    const predecessor = presenceStore({
      redis: {
        command: {
          ...store.command,
          mget: async (keys) => {
            const values = await store.command.mget(keys);

            if (
              !transferred &&
              keys.includes("presence:organization-1:lost-expiry-lease")
            ) {
              transferred = true;
              await store.command.del("presence:expiry:sweep-lock");
              await Effect.runPromise(successor.sweepExpired);
              await Effect.runPromise(successor.sweepOffline);
              expect(offline.events).toHaveLength(1);
            }

            return values;
          },
        },
      },
      now: () => now,
      publishOffline: offline.publish,
    });

    await Effect.runPromise(predecessor.sweepExpired);
    await Effect.runPromise(successor.sweepOffline);
    expect(transferred).toBe(true);
    expect(offline.events).toHaveLength(1);
    expect(await dueDepartures(store)).toEqual([]);
  });

  test("offline sweeps share bounded Organization work, drain a backlog in bounded batches, and reject a lease lost during a read", async () => {
    await using redis = await openStore();
    const { store } = redis;
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();
    const readStarted = Promise.withResolvers<void>();
    const resumeRead = Promise.withResolvers<void>();
    let organizationReads = 0;
    const pendingBatchSizes: number[] = [];
    let pause = true;

    const command = {
      ...store.command,
      mget: async (keys: string[]) => {
        const captured = await store.command.mget(keys);

        if (keys[0]?.startsWith("presence:offline:"))
          pendingBatchSizes.push(keys.length);

        if (keys.includes("presence:organization-1:active")) {
          organizationReads++;

          if (pause) {
            readStarted.resolve();
            await resumeRead.promise;
          }
        }

        return captured;
      },
    };

    const makePresence = () =>
      presenceStore({
        redis: { command },
        now: () => now,
        publishOffline: offline.publish,
      });

    const presence = makePresence();
    await connect(presence, gameSocket("active"));
    const keys: string[] = [];

    for (let index = 0; index < 250; index++) {
      const key = `presence:offline:fixture:${index}`;
      keys.push(key);
      await store.command.set(
        key,
        JSON.stringify({
          ...departure(String(index), now - 10_000),
          userId: `departed-${index}`,
        }),
      );
    }

    await addDueDepartures(store, ...keys);
    const reusedSweep = presence.sweepOffline;
    const first = Effect.runPromise(reusedSweep);
    await readStarted.promise;
    await Effect.runPromise(makePresence().sweepOffline);
    expect(organizationReads).toBe(1);
    expect(offline.events).toHaveLength(0);
    await takeOverOfflineSweep(store);
    const reconnected = makeSocket("reconnected").socket;
    reconnected.data = {
      ...reconnected.data,
      userId: "departed-0",
      character: {
        world: "classic",
        characterId: "character-0",
        accountId: "account-0",
        name: "Reconnected",
        lvl: 100,
        prof: "w",
        icon: "hero.gif",
      },
    };
    await connect(presence, reconnected);
    pause = false;
    resumeRead.resolve();
    await first;
    expect(offline.events).toHaveLength(0);
    expect(await store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual([]);
    expect(await dueDepartures(store)).toHaveLength(250);
    expect(await store.command.get(OFFLINE_SWEEP_LOCK)).toBe("successor");
    await store.command.del(OFFLINE_SWEEP_LOCK);

    await store.command.set("malformed-due", '{"userId":"old-schema"}');
    await addDueDepartures(store, "malformed-due");
    await store.command.set("malformed-outbox", '{"userId":"old-schema"}');
    await store.command.sadd(OFFLINE_OUTBOX_INDEX, "malformed-outbox");

    for (let batch = 0; batch < 20 && offline.events.length < 249; batch++) {
      await Effect.runPromise(reusedSweep);
    }

    expect(offline.events).toHaveLength(249);
    expect(offline.events.some(({ userId }) => userId === "departed-0")).toBe(
      false,
    );
    expect(Math.max(...pendingBatchSizes)).toBeLessThanOrEqual(100);
    expect(organizationReads).toBeLessThan(10);
    expect(new Set(offline.events.map((event) => event.userId)).size).toBe(249);
    expect(await store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual([]);
    expect(await store.command.mget(keys)).toEqual(keys.map(() => null));

    expect(await dueDepartures(store)).toEqual([]);
    expect(
      await store.command.mget(["malformed-due", "malformed-outbox"]),
    ).toEqual([null, null]);
  });

  test("invalid-record cleanup keeps a departure rewritten after it was read", async () => {
    await using redis = await openStore();
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const drops = interceptScript(
      redis.store.command,
      "-- presence:offline-drop",
    );

    const presence = presenceStore({
      redis: { command: drops.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const key = "presence:offline:rewritten";
    const rewritten = departure("rewritten", now - 10_000);
    await redis.store.command.set(key, '{"userId":"old-schema"}');
    await addDueDepartures(redis.store, key);
    drops.before = async () => {
      await redis.store.command.set(key, JSON.stringify(rewritten));
    };

    await Effect.runPromise(presence.sweepOffline);
    expect(drops.results).toEqual([0]);
    expect(await redis.store.command.get(key)).toBe(JSON.stringify(rewritten));
    expect(await dueDepartures(redis.store)).toEqual([key]);
    expect(offline.events).toEqual([]);

    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([rewritten]);
    expect(await dueDepartures(redis.store)).toEqual([]);
  });

  test("an offline sweep that loses its lease before renewing it publishes no captured outbox record", async () => {
    await using redis = await openStore();
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const renewals = interceptScript(
      redis.store.command,
      "-- presence:offline-renew",
    );

    const presence = presenceStore({
      redis: { command: renewals.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const key = "presence:offline:captured";
    const captured = departure("captured", now - 10_000);
    await redis.store.command.set(key, JSON.stringify(captured));
    await redis.store.command.sadd(OFFLINE_OUTBOX_INDEX, key);

    renewals.before = () => takeOverOfflineSweep(redis.store);

    await Effect.runPromise(presence.sweepOffline);
    expect(renewals.results).toEqual([0]);
    expect(offline.events).toEqual([]);
    expect(await redis.store.command.get(key)).toBe(JSON.stringify(captured));
    expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual([
      key,
    ]);
    expect(await redis.store.command.get(OFFLINE_SWEEP_LOCK)).toBe("successor");

    await redis.store.command.del(OFFLINE_SWEEP_LOCK);
    await Effect.runPromise(presence.sweepOffline);
    expect(offline.events).toEqual([captured]);
    expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual(
      [],
    );
  });

  test("an offline sweep stops publishing once an acknowledgement finds its lease lost", async () => {
    await using redis = await openStore();
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const acknowledgements = interceptScript(
      redis.store.command,
      "-- presence:offline-ack",
    );

    const presence = presenceStore({
      redis: { command: acknowledgements.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const keys = ["presence:offline:first", "presence:offline:second"];

    for (const [index, key] of keys.entries()) {
      await redis.store.command.set(
        key,
        JSON.stringify(departure(`outbox-${index}`, now - 10_000)),
      );
      await redis.store.command.sadd(OFFLINE_OUTBOX_INDEX, key);
    }

    acknowledgements.before = () => takeOverOfflineSweep(redis.store);

    await Effect.runPromise(presence.sweepOffline);
    expect(acknowledgements.results).toEqual([-1]);
    expect(offline.events).toHaveLength(1);
    expect(
      (await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toSorted(),
    ).toEqual(keys);
    expect(await redis.store.command.get(OFFLINE_SWEEP_LOCK)).toBe("successor");

    await redis.store.command.del(OFFLINE_SWEEP_LOCK);
    await Effect.runPromise(presence.sweepOffline);
    expect(new Set(offline.events.map(({ userId }) => userId))).toEqual(
      new Set(["user-outbox-0", "user-outbox-1"]),
    );
    expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual(
      [],
    );
  });
});
