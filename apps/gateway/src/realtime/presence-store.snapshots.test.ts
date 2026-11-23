import { describe, expect, spyOn, test } from "bun:test";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { encodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import type { Capability } from "@lootlog/schema/permissions";
import { Cause, Effect, Exit } from "effect";
import { TestClock } from "effect/testing";
import { RealtimeStoreError } from "./realtime-errors.js";
import type { SessionData } from "#src/realtime/session";
import {
  MemoryRedis,
  READ,
  LOCATION,
  session,
  secondGuild,
  socket,
  numberedSocket,
  makeStore,
  publish,
  disconnect,
  readSnapshot,
  flush,
} from "../../test/presence-store-fixtures.js";
import { membership } from "../../test/realtime-fixtures.js";

const LARGEST_ORGANIZATION_ACTIVE_MEMBERS = 528;

const PRECISE_SNAPSHOT_BYTE_BUDGET = 320_000;

const BASIC_SNAPSHOT_BYTE_BUDGET = 280_000;

const webViewer = (permissions: Capability[]): SessionData => ({
  ...session(permissions),
  platform: "web-app",
});

const gateMget = (redis: MemoryRedis) => {
  const started = Promise.withResolvers<void>();
  const gate = Promise.withResolvers<void>();
  const original = redis.mget.bind(redis);

  const spy = spyOn(redis, "mget").mockImplementation(async (keys) => {
    const values = await original(keys);
    started.resolve();
    await gate.promise;

    return values;
  });

  return { started: started.promise, release: () => gate.resolve(), spy };
};

describe("PresenceStore", () => {
  test.each(["publish", "disconnect"])(
    "follows a snapshot shared across a %s with a newer delta, then reads again",
    async (mutation) => {
      let now = 10_000;
      const { redis, hub, store } = makeStore({ now: () => now });
      const viewer = session([READ]);
      const publisher = socket(viewer);
      await publish(store, publisher);
      await flush(store);
      const read = gateMget(redis);
      const first = readSnapshot(store, viewer);
      await read.started;
      now = 11_000;

      if (mutation === "publish")
        await publish(store, publisher, { isAfk: true });
      else await disconnect(store, publisher);

      const joined = readSnapshot(store, viewer);

      read.release();

      for (const snapshot of await Promise.all([first, joined]))
        expect(snapshot).toMatchObject({
          revision: 1,
          presences: [{ isAfk: false }],
        });

      await flush(store);

      expect(hub.presenceEvents.at(-1)?.basic).toMatchObject({
        data: {
          revision: 2,
          changes: [{ action: mutation === "publish" ? "upsert" : "remove" }],
        },
      });

      const after = await readSnapshot(store, viewer);

      expect(after.revision).toBe(2);
      expect(after.presences).toEqual(
        mutation === "publish"
          ? [expect.objectContaining({ isAfk: true })]
          : [],
      );
    },
  );

  test.each(["success", "failure"])(
    "an old snapshot's %s cannot evict the replacement shared read",
    async (outcome) => {
      const { redis, store } = makeStore();
      const viewer = session([READ]);
      const publisher = socket(viewer);
      await publish(store, publisher);
      await flush(store);
      const firstStarted = Promise.withResolvers<void>();
      const firstGate = Promise.withResolvers<void>();
      const replacementStarted = Promise.withResolvers<void>();
      const replacementGate = Promise.withResolvers<void>();
      const originalMget = redis.mget.bind(redis);
      let reads = 0;
      spyOn(redis, "mget").mockImplementation(async (keys) => {
        const read = ++reads;

        if (read === 1) {
          firstStarted.resolve();
          await firstGate.promise;
        }

        if (read === 2) {
          replacementStarted.resolve();
          await replacementGate.promise;
        }

        return originalMget(keys);
      });

      const first = Effect.runPromiseExit(
        store.snapshot(viewer, "organization-1"),
      );

      try {
        await firstStarted.promise;
        await publish(store, publisher, { isAfk: true });
        await flush(store);
        const replacement = readSnapshot(store, viewer);
        await replacementStarted.promise;

        if (outcome === "success") firstGate.resolve();
        else firstGate.reject(new Error("Snapshot read failed"));
        await first;

        const follower = readSnapshot(store, viewer);

        replacementGate.resolve();
        const snapshots = await Promise.all([replacement, follower]);
        expect(reads).toBe(2);

        for (const snapshot of snapshots) {
          expect(snapshot.presences[0]?.isAfk).toBe(true);
          expect(snapshot.revision).toBe(2);
        }
      } finally {
        firstGate.resolve();
        replacementGate.resolve();
        await first;
      }
    },
  );

  test.each(["smembers", "mget"])(
    "bounds a stalled %s read and allows a fresh snapshot without waiting for it to settle",
    async (stage) => {
      const { redis, store } = makeStore();
      const viewer = session([READ]);
      await publish(store, socket(viewer));
      await flush(store);
      const stalled = Promise.withResolvers<void>();
      const started = Promise.withResolvers<void>();
      let shouldStall = true;

      const pause = async (operation: string) => {
        if (shouldStall && operation === stage) {
          started.resolve();
          await stalled.promise;
        }
      };

      const originalSmembers = redis.smembers.bind(redis);
      const originalMget = redis.mget.bind(redis);
      spyOn(redis, "smembers").mockImplementation(async (key) => {
        await pause("smembers");

        return originalSmembers(key);
      });
      spyOn(redis, "mget").mockImplementation(async (keys) => {
        await pause("mget");

        return originalMget(keys);
      });
      const errors: unknown[] = [];

      const snapshot = store.snapshot(viewer, "organization-1").pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            errors.push(error);
          }),
        ),
        Effect.exit,
      );

      try {
        await Effect.runPromise(
          Effect.gen(function* () {
            yield* snapshot.pipe(Effect.forkScoped);
            yield* Effect.promise(() => started.promise);
            yield* snapshot.pipe(Effect.forkScoped);
            yield* TestClock.adjust("10 seconds");
            expect(errors).toHaveLength(2);

            for (const error of errors) {
              expect(error).toBeInstanceOf(RealtimeStoreError);

              if (error instanceof RealtimeStoreError) {
                expect(error.operation).toBe("presence.snapshot");
                expect(Cause.isTimeoutError(error.cause)).toBe(true);
              }
            }

            shouldStall = false;
            const recovered = yield* store.snapshot(viewer, "organization-1");
            expect(recovered.presences).toHaveLength(1);
            expect(recovered.presences[0]?.discordId).toBe("discord-1");
            expect(recovered.revision).toBe(1);
          }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
        );
      } finally {
        stalled.resolve();
      }
    },
  );

  test("shares overlapping snapshot reads while keeping viewer and Organization projections separate", async () => {
    const { redis, store } = makeStore();

    const publisher = socket({
      ...session([READ]),
      guilds: [...session([]).guilds, secondGuild([])],
      character: {
        world: "world-1",
        characterId: "1",
        accountId: "1",
        name: "Hero",
        lvl: 100,
        icon: "hero.gif",
        prof: "w",
      },
    });

    await publish(store, publisher, {
      location: { mapId: 42, map: "Target", x: 4, y: 7 },
    });
    const read = gateMget(redis);
    const smembers = spyOn(redis, "smembers");
    const basic = webViewer([READ]);
    const precise = webViewer([READ, LOCATION]);

    const snapshots = Promise.all([
      readSnapshot(store, basic, "organization-1", "world-1"),
      readSnapshot(store, precise, "organization-1", "world-1"),
      readSnapshot(store, precise, "organization-1", "other-world"),
      readSnapshot(store, basic, "organization-2"),
    ]);

    read.release();
    const [hidden, visible, otherWorld, otherOrganization] = await snapshots;
    expect(hidden?.presences).toHaveLength(1);
    expect(hidden?.presences[0]).not.toHaveProperty("location");
    expect(visible?.presences[0]).toHaveProperty("location.mapId", 42);
    expect(otherWorld?.presences).toEqual([]);
    expect(visible?.presences[0]?.organizationIds).toEqual(["organization-1"]);
    expect(otherOrganization?.presences[0]?.organizationIds).toEqual([
      "organization-2",
    ]);
    expect(smembers).toHaveBeenCalledTimes(2);
    expect(read.spy).toHaveBeenCalledTimes(2);
    await readSnapshot(store, basic);
    expect(read.spy).toHaveBeenCalledTimes(2);
  });

  test.each(["initiator", "follower"])(
    "cancelling the %s does not cancel another viewer's snapshot",
    async (cancelled) => {
      const { redis, store } = makeStore();
      const viewer = session([READ]);
      await publish(store, socket(viewer));
      const read = gateMget(redis);
      const controller = new AbortController();

      const first = Effect.runPromiseExit(
        store.snapshot(viewer, "organization-1"),
        cancelled === "initiator" ? { signal: controller.signal } : undefined,
      );

      await read.started;

      const second = Effect.runPromiseExit(
        store.snapshot(viewer, "organization-1"),
        cancelled === "follower" ? { signal: controller.signal } : undefined,
      );

      controller.abort();
      const interrupted = await (cancelled === "initiator" ? first : second);
      expect(interrupted._tag).toBe("Failure");
      read.release();
      const surviving = await (cancelled === "initiator" ? second : first);
      expect(Exit.isSuccess(surviving)).toBe(true);

      if (Exit.isSuccess(surviving)) {
        expect(surviving.value.presences).toMatchObject([
          { sessionId: "session-1" },
        ]);
      }

      expect(read.spy).toHaveBeenCalledTimes(1);
      await readSnapshot(store, viewer);
      expect(read.spy).toHaveBeenCalledTimes(1);
    },
  );

  test.each(["smembers", "mget"] as const)(
    "shares %s failures without caching them after Redis recovers",
    async (operation) => {
      const { redis, store } = makeStore();
      const viewer = session([READ]);
      await publish(store, socket(viewer));
      await flush(store);
      const gate = Promise.withResolvers<void>();

      const failing = spyOn(redis, operation).mockImplementation(async () => {
        await gate.promise;
        throw new Error("Redis unavailable");
      });

      const reads = [
        Effect.runPromiseExit(store.snapshot(viewer, "organization-1")),
        Effect.runPromiseExit(store.snapshot(viewer, "organization-1")),
      ];

      gate.resolve();

      for (const result of await Promise.all(reads))
        expect(result._tag).toBe("Failure");
      expect(failing).toHaveBeenCalledTimes(1);
      failing.mockRestore();

      const recovered = await readSnapshot(store, viewer);

      expect(recovered.presences).toHaveLength(1);
      expect(recovered.revision).toBe(1);
    },
  );

  test("re-checks viewer permissions after a shared read and hides expired presence without a sweep", async () => {
    let now = 10_000;
    const { redis, store } = makeStore({ now: () => now });
    const viewer = session([READ, LOCATION]);
    const publisher = socket(session([READ]));
    const location = { mapId: 42, map: "Target", x: 4, y: 7 };
    await publish(store, publisher, { location });
    const read = gateMget(redis);

    const snapshots = Promise.all([
      readSnapshot(store, viewer),
      readSnapshot(store, viewer),
    ]);

    await read.started;
    viewer.guilds = session([READ]).guilds;
    read.release();

    for (const snapshot of await snapshots)
      expect(snapshot.presences[0]).not.toHaveProperty("location");

    await publish(store, publisher, { location, isAfk: true });
    await flush(store);
    expect(await readSnapshot(store, viewer)).toMatchObject({
      revision: 1,
      presences: [{ isAfk: true }],
    });

    now += PRESENCE_EXPIRY_MS;
    expect((await readSnapshot(store, viewer)).presences).toEqual([]);
  });

  test("lists a map's sessions from one Organization read, skipping other maps", async () => {
    const { redis, store } = makeStore();

    for (let index = 0; index < 5; index++) {
      await publish(store, numberedSocket(index), {
        isAfk: index === 1,
        location: {
          mapId: index === 4 ? 2 : 1,
          map: index === 4 ? "Other" : "Target",
          x: 1,
          y: 1,
        },
      });
    }

    const get = spyOn(redis, "get");
    const mget = spyOn(redis, "mget");
    expect(
      await Effect.runPromise(store.coverageForMap("organization-1", "Target")),
    ).toEqual([
      { discordId: "discord-0", isAfk: false },
      { discordId: "discord-1", isAfk: true },
      { discordId: "discord-2", isAfk: false },
      { discordId: "discord-3", isAfk: false },
    ]);
    expect(get).not.toHaveBeenCalled();
    expect(mget).toHaveBeenCalledTimes(1);
    mget.mockClear();
    expect(
      await Effect.runPromise(store.coverageForMap("organization-1", "Empty")),
    ).toEqual([]);
    expect(mget).toHaveBeenCalledTimes(1);
  });

  test("keeps the largest Organization's world presence snapshot to its own sessions and under its byte budget, so per-presence bloat or leaked Organization ids fail", async () => {
    const { store } = makeStore({
      now: () => Date.parse("2026-11-11T08:00:00Z"),
    });

    const organizationId = "1517975903131406436";
    const otherOrganizationId = "1223296584318451732";

    const publishMember = (index: number, world: string) =>
      publish(
        store,
        numberedSocket(index, {
          connectionId: crypto.randomUUID(),
          userId: `${index}`.padStart(32, "u"),
          discordId: `${1_242_479_908_928_618_547n + BigInt(index)}`,
          guilds: [
            membership(organizationId, [READ]),
            membership(otherOrganizationId, [READ]),
          ],
        }),
        {
          character: {
            world,
            name: `Postać ${index}`.padEnd(11, "a"),
            lvl: 200 + (index % 100),
            icon: `/kuf/her_xxvi_${index}.gif`.padEnd(21, "k"),
            characterId: `${8_000_000 + index}`,
            accountId: `${9_000_000 + index}`,
            prof: "w",
            clan: { id: 1000 + (index % 7), name: "Bractwo Nubes", rank: 3 },
          },
          location: {
            mapId: 1000 + index,
            map: "Grota Dzikiego Kota p.2",
            x: 40 + (index % 60),
            y: 20 + (index % 40),
          },
        },
      );

    for (let index = 0; index < LARGEST_ORGANIZATION_ACTIVE_MEMBERS; index++)
      await publishMember(index, "nubes");

    for (let index = 0; index < 50; index++)
      await publishMember(LARGEST_ORGANIZATION_ACTIVE_MEMBERS + index, "lupus");

    const encodedSnapshot = async (permissions: Capability[]) => {
      const snapshot = await readSnapshot(
        store,
        {
          ...webViewer(permissions),
          guilds: [membership(organizationId, permissions)],
        },
        organizationId,
        "nubes",
      );

      return {
        snapshot,
        bytes: Buffer.byteLength(
          encodeRealtimeFrame({
            v: 1,
            type: "presence.snapshot",
            sequence: snapshot.revision,
            data: snapshot,
          }),
        ),
      };
    };

    const precise = await encodedSnapshot([READ, LOCATION]);
    const basic = await encodedSnapshot([READ]);

    expect(precise.snapshot.presences).toHaveLength(
      LARGEST_ORGANIZATION_ACTIVE_MEMBERS,
    );
    expect(
      new Set(
        precise.snapshot.presences.flatMap(
          (presence) => presence.organizationIds,
        ),
      ),
    ).toEqual(new Set([organizationId]));
    expect(precise.bytes).toBeLessThanOrEqual(PRECISE_SNAPSHOT_BYTE_BUDGET);
    expect(basic.bytes).toBeLessThanOrEqual(BASIC_SNAPSHOT_BYTE_BUDGET);
  });
});
