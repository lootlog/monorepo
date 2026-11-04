import { describe, expect, spyOn, test } from "bun:test";
import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { Permission } from "@lootlog/schema/permissions";
import { Cause, Effect, Exit, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { PresenceStore } from "./presence-store.js";
import { RealtimeStoreError } from "./realtime-errors.js";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import {
  makeSession,
  makeTestSocket,
  membership,
} from "../../test/realtime-fixtures.js";

class MemoryRedis {
  readonly values = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();
  readonly sortedSets = new Map<string, Map<string, number>>();

  async set(
    key: string,
    value: string,
    ...options: Array<string | number>
  ): Promise<string | null> {
    if (options.includes("NX") && this.values.has(key)) return null;
    const previous = this.values.get(key);

    if (options.includes("XX") && previous === undefined) return null;
    this.values.set(key, value);

    return options.includes("GET") ? (previous ?? null) : "OK";
  }

  async eval<A>(
    script: string,
    numberOfKeys: number,
    ...parameters: Array<string | number>
  ): Promise<A> {
    // SAFETY: This Redis boundary fake returns the same numeric/string replies as the exercised scripts; real Lua is covered by Dragonfly integration tests.
    return (await this.evaluate(script, numberOfKeys, parameters)) as A;
  }

  private async evaluate(
    _script: string,
    _numberOfKeys: number,
    parameters: Array<string | number>,
  ): Promise<string | number> {
    const args = parameters.map(String);

    if (_script.includes("-- presence:refresh"))
      return this.refresh(args, _numberOfKeys);

    if (_script.includes("-- presence:expiry-ready"))
      return this.expiryReady(args);

    if (_script.includes("-- presence:expiry-remove"))
      return this.removeExpired(args, _numberOfKeys);

    if (_script.includes("-- presence:remove"))
      return this.removePresence(args, _numberOfKeys);

    if (_script.includes("-- presence:offline-schedule"))
      return this.scheduleOffline(args, _numberOfKeys);

    if (_script.includes("-- presence:offline-ready"))
      return this.readOfflineReady(args);

    if (_script.includes("-- presence:offline-renew"))
      return Number(this.values.get(args[0]!) === args[1]);

    if (_script.includes("-- presence:lease-release"))
      return this.releaseLease(args);

    if (_script.includes("-- presence:offline-ack"))
      return this.ackOffline(args);

    return this.claimOffline(args, _numberOfKeys);
  }

  private expiryReady(args: string[]): string {
    if (this.values.get(args[0]!) !== args[2]) return "[]";

    return JSON.stringify(
      [...(this.sortedSets.get(args[1]!) ?? [])]
        .filter(([, score]) => score <= Number(args[4]))
        .sort((a, b) => a[1] - b[1])
        .slice(0, Number(args[5]))
        .map(([member]) => member),
    );
  }

  private removeExpired(args: string[], numberOfKeys: number): number {
    const values = args.slice(numberOfKeys);

    if (this.values.get(args[0]!) !== values[0]) return 0;
    const score = this.sortedSets.get(args[4]!)?.get(values[3]!);

    if (score === undefined || score > Number(values[4])) return 0;

    if (
      (this.values.get(args[1]!) ?? "") !== values[1] ||
      (this.values.get(args[2]!) ?? "") !== values[2]
    )
      return 0;

    this.values.delete(args[1]!);
    this.values.delete(args[2]!);
    this.sets.get(args[3]!)?.delete(values[5]!);
    this.sortedSets.get(args[4]!)?.delete(values[3]!);

    return 1;
  }

  private async removePresence(
    args: string[],
    numberOfKeys: number,
  ): Promise<number> {
    const [dueIndex] = args;
    const values = args.slice(numberOfKeys);

    for (let key = 1; key < numberOfKeys; key += 3) {
      const [presence, metadata, index] = args.slice(key, key + 3);

      const [member, dueMember] = values.slice(
        ((key - 1) / 3) * 2,
        ((key - 1) / 3) * 2 + 2,
      );

      await this.del(presence!, metadata!);
      await this.srem(index!, member!);
      this.sortedSets.get(dueIndex!)?.delete(dueMember!);
    }

    return 1;
  }

  private async cancelDepartures(
    [index, due]: string[],
    departures: string[],
    members: string[],
  ): Promise<void> {
    for (const [position, key] of departures.entries()) {
      await this.del(key);
      await this.srem(index!, members[position]!);
      this.sortedSets.get(due!)?.delete(members[position]!);
    }
  }

  private async refresh(
    args: string[],
    numberOfKeys: number,
  ): Promise<string | number> {
    const [dueIndex] = args;
    const values = args.slice(numberOfKeys);

    for (let key = 1; key < numberOfKeys; key += 3) {
      const [presence, metadata, index] = args.slice(key, key + 3);
      const offset = 4 + ((key - 1) / 3) * 2;
      const [member, dueMember] = values.slice(offset, offset + 2);

      await this.set(presence!, values[0]!);
      await this.set(metadata!, values[2]!);

      if (!this.sets.get(index!)?.has(member!))
        await this.sadd(index!, member!);

      const due = this.sortedSets.get(dueIndex!) ?? new Map<string, number>();
      due.set(dueMember!, Number(values[3]));
      this.sortedSets.set(dueIndex!, due);
    }

    return 1;
  }

  private async scheduleOffline(
    args: string[],
    numberOfKeys: number,
  ): Promise<string | number> {
    const [key, index, dueIndex] = args;
    const [event, member, dueAt, ...superseded] = args.slice(numberOfKeys);

    await this.cancelDepartures(
      [index!, dueIndex!],
      args.slice(3, numberOfKeys),
      superseded,
    );
    await this.set(key!, event!);
    await this.sadd(index!, member!);
    const due = this.sortedSets.get(dueIndex!) ?? new Map<string, number>();
    due.set(member!, Number(dueAt));
    this.sortedSets.set(dueIndex!, due);

    return 1;
  }

  private async readOfflineReady(args: string[]): Promise<string | number> {
    const key = args[0]!;

    if (this.values.get(key) !== args[2]) return "[]";

    const entries =
      args[4] === "due"
        ? [...(this.sortedSets.get(args[1]!) ?? [])]
            .filter(([, due]) => due <= Number(args[5]))
            .sort((left, right) => left[1] - right[1])
            .map(([member]) => member)
        : [...(this.sets.get(args[1]!) ?? [])];

    return JSON.stringify(entries.slice(0, Number(args[6])));
  }

  private async releaseLease(args: string[]): Promise<string | number> {
    const key = args[0]!;

    if (this.values.get(key) !== args[1]) return 0;

    return await this.del(key);
  }

  private async ackOffline(args: string[]): Promise<string | number> {
    const key = args[0]!;

    if (this.values.get(key) !== args[3]) return -1;

    if (this.values.get(args[1]!) !== args[4]) return 0;
    await this.del(args[1]!);
    await this.srem(args[2]!, args[5]!);

    return 1;
  }

  private async claimOffline(
    args: string[],
    _numberOfKeys: number,
  ): Promise<number> {
    const [lock, outboxIndex, dueIndex] = args;
    const values = args.slice(_numberOfKeys);

    if (this.values.get(lock!) !== values[0]) return -1;
    let completed = 0;

    for (let index = 3; index < _numberOfKeys; index += 3) {
      const [pending, outbox, characterIndex] = args.slice(index, index + 3);
      const offset = 2 + ((index - 3) / 3) * 4;

      const [value, pendingMember, outboxMember, publish] = values.slice(
        offset,
        offset + 4,
      );

      if (this.values.get(pending!) !== value) continue;
      this.values.delete(pending!);
      this.sortedSets.get(dueIndex!)?.delete(pendingMember!);
      this.sets.get(characterIndex!)?.delete(pendingMember!);

      if (publish === "1") {
        this.values.set(outbox!, value!);
        const set = this.sets.get(outboxIndex!) ?? new Set<string>();
        set.add(outboxMember!);
        this.sets.set(outboxIndex!, set);
      }

      completed++;
    }

    return completed;
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;

    for (const key of keys) if (this.values.delete(key)) count += 1;

    return count;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>();
    this.sets.set(key, set);
    const size = set.size;

    for (const member of members) set.add(member);

    return set.size - size;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);

    if (!set) return 0;
    let count = 0;

    for (const member of members) if (set.delete(member)) count += 1;

    return count;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  async mget(keys: string[]): Promise<Array<string | null>> {
    return keys.map((key) => this.values.get(key) ?? null);
  }

  async incr(key: string): Promise<number> {
    const value = Number(this.values.get(key) ?? 0) + 1;
    this.values.set(key, String(value));

    return value;
  }
}

type PresenceEvent = Parameters<RealtimeHub["publishPresence"]>[1];

class RecordingHub {
  readonly presenceEvents: Array<{
    readonly basic: PresenceEvent;
    readonly precise: PresenceEvent;
  }> = [];

  setPresence(socket: GatewaySocket, presence: SessionData["presence"]): void {
    socket.data.presence = presence;
  }

  async publishPresence(
    _scope: Parameters<RealtimeHub["publishPresence"]>[0],
    basic: PresenceEvent,
    precise: PresenceEvent,
  ): Promise<void> {
    this.presenceEvents.push({ basic, precise });
  }
}

type CoverageEvent = {
  readonly guildId: string;
  readonly mapName: string;
  readonly discordId: string;
  readonly hasPlayer: boolean;
  readonly isAfk?: boolean;
};

class RecordingCoverage {
  readonly events: CoverageEvent[] = [];

  publish(event: CoverageEvent): Effect.Effect<void> {
    return Effect.sync(() => {
      this.events.push(event);
    });
  }
}

const READ = Permission.LOOTLOG_ONLINE_PLAYERS_READ;

const LOCATION = Permission.LOOTLOG_PRESENCE_LOCATION_READ;

const character = {
  name: "Player",
  characterId: "character-1",
  accountId: "account-1",
  world: "world-1",
  lvl: 100,
  prof: "w",
  icon: "player.gif",
};

const session = (permissions: Permission[]): SessionData =>
  makeSession({
    connectionId: "session-1",
    platform: "game",
    guilds: [
      membership("organization-1", permissions, { ownerId: "someone-else" }),
    ],
  });

// Reads presence outside the game, where no publication is required.
const webViewer = (permissions: Permission[]): SessionData => ({
  ...session(permissions),
  platform: "web-app",
});

const secondGuild = (permissions: Permission[]) =>
  membership("organization-2", permissions, {
    ownerId: "someone-else",
    roleId: "role-2",
  });

const socket = (data: SessionData): GatewaySocket =>
  makeTestSocket(data).socket;

const numberedSocket = (index: number, overrides: Partial<SessionData> = {}) =>
  socket({
    ...session([READ]),
    connectionId: `session-${index}`,
    userId: `user-${index}`,
    discordId: `discord-${index}`,
    ...overrides,
  });

const gameSocket = (overrides: Partial<SessionData> = {}) =>
  socket({ ...session([]), character, ...overrides });

// Publishes to every Lootlog of the session, as a client whose character catches for all of them.
const joinedOrganizations = (target: GatewaySocket) =>
  target.data.guilds.map(({ guild }) => guild.id);

const makeStore = ({
  now = () => 10_000,
  coverage,
}: {
  readonly now?: () => number;
  readonly coverage?: ConstructorParameters<typeof PresenceStore>[3];
} = {}) => {
  const redis = new MemoryRedis();
  const hub = new RecordingHub();
  const store = new PresenceStore({ command: redis }, hub, now, coverage);

  return { redis, hub, store };
};

const offlineStore = (
  redis: MemoryRedis,
  now: () => number,
  events: GameCharacterOffline[] = [],
  afterPublish?: () => void,
) => {
  const store = new PresenceStore(
    { command: redis },
    new RecordingHub(),
    now,
    undefined,
    undefined,
    (event) =>
      Effect.sync(() => {
        events.push(event);
        afterPublish?.();
      }),
  );

  return { store, events };
};

const publish = (
  store: PresenceStore,
  target: GatewaySocket,
  data: Partial<Parameters<PresenceStore["publish"]>[1]> = {},
) =>
  Effect.runPromise(
    store.publish(target, {
      organizationIds: joinedOrganizations(target),
      ...data,
    }),
  );

const disconnect = (store: PresenceStore, target: GatewaySocket) =>
  Effect.runPromise(store.disconnect(target.data));

const readSnapshot = (
  store: PresenceStore,
  viewer: SessionData = session([READ]),
  organizationId = "organization-1",
  world?: string,
) => Effect.runPromise(store.snapshot(viewer, organizationId, world));

const flush = (store: PresenceStore) => Effect.runPromise(store.flushDeltas());

const sweepExpired = (store: PresenceStore) =>
  Effect.runPromise(store.sweepExpired());

const sweepOffline = (store: PresenceStore) =>
  Effect.runPromise(store.sweepOffline());

const deltaChanges = (hub: RecordingHub, action: "upsert" | "remove") =>
  hub.presenceEvents.flatMap(({ basic }) =>
    basic.type === "presence.delta"
      ? basic.data.changes.filter((change) => change.action === action)
      : [],
  );

/** Holds every `mget` reply, read before the gate, until `release`. */
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

      // The change is stored but not yet announced, so the revision is unchanged.
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

  test("announces a write that settles after its caller was interrupted", async () => {
    const { redis, hub, store } = makeStore();
    const publisher = socket(session([READ]));
    await publish(store, publisher);
    await flush(store);
    hub.presenceEvents.length = 0;
    const started = Promise.withResolvers<void>();
    const gate = Promise.withResolvers<void>();
    const evaluate = redis.eval.bind(redis);

    spyOn(redis, "eval").mockImplementationOnce(async (...parameters) => {
      started.resolve();
      await gate.promise;

      return evaluate(...parameters);
    });

    const controller = new AbortController();

    const publication = Effect.runPromiseExit(
      store.publish(publisher, {
        organizationIds: joinedOrganizations(publisher),
        isAfk: true,
      }),
      { signal: controller.signal },
    );

    await started.promise;
    controller.abort();
    expect(Exit.isFailure(await publication)).toBe(true);
    gate.resolve();
    await Bun.sleep(0);
    await flush(store);

    expect(deltaChanges(hub, "upsert")).toMatchObject([
      { presence: { sessionId: "session-1", isAfk: true } },
    ]);
  });

  test("a join burst costs one revision per flush and keeps snapshot reads flat", async () => {
    const { redis, hub, store } = makeStore();
    const mget = spyOn(redis, "mget");
    const incr = spyOn(redis, "incr");

    const join = async (index: number) => {
      const joining = numberedSocket(index);
      await publish(store, joining);
      // Every joining client fetches the Organization snapshot.
      await readSnapshot(store, joining.data);
    };

    for (let index = 0; index < 1_000; index++) {
      await join(index);

      if (index % 100 === 99) await flush(store);
    }

    expect(incr).toHaveBeenCalledTimes(10);
    expect(hub.presenceEvents).toHaveLength(10);
    expect(deltaChanges(hub, "upsert")).toHaveLength(1_000);
    expect(mget).toHaveBeenCalledTimes(10);

    hub.presenceEvents.length = 0;

    for (let index = 1_000; index < 1_250; index++) await join(index);
    await flush(store);

    expect(
      hub.presenceEvents.map(({ basic }) =>
        basic.type === "presence.delta"
          ? [basic.data.revision, basic.data.changes.length]
          : [],
      ),
    ).toEqual([
      [11, 100],
      [12, 100],
      [13, 50],
    ]);
  });

  test("a session's latest change in a batch supersedes its earlier ones", async () => {
    const { hub, store } = makeStore();
    const publisher = socket(session([READ]));
    await publish(store, publisher);
    await publish(store, publisher, { isAfk: true });
    await flush(store);
    expect(deltaChanges(hub, "upsert")).toMatchObject([
      { presence: { sessionId: "session-1", isAfk: true } },
    ]);

    hub.presenceEvents.length = 0;
    await publish(store, publisher, { isAfk: false });
    await disconnect(store, publisher);
    await flush(store);
    expect(hub.presenceEvents).toHaveLength(1);
    expect(deltaChanges(hub, "upsert")).toEqual([]);
    expect(deltaChanges(hub, "remove")).toMatchObject([
      { sessionId: "session-1" },
    ]);
  });

  test("retries a failed delta without overriding a newer change", async () => {
    const { hub, store } = makeStore();
    const first = socket(session([READ]));
    const second = socket({ ...session([READ]), connectionId: "session-2" });
    await publish(store, first);
    await publish(store, second);
    spyOn(hub, "publishPresence").mockImplementationOnce(async () => {
      // A departure queued while the failed flush is in flight is newer.
      await disconnect(store, second);
      throw new Error("Redis publish failed");
    });

    await flush(store);
    expect(hub.presenceEvents).toEqual([]);

    await flush(store);
    expect(hub.presenceEvents).toHaveLength(1);
    expect(deltaChanges(hub, "upsert")).toMatchObject([
      { presence: { sessionId: "session-1" } },
    ]);
    expect(deltaChanges(hub, "remove")).toMatchObject([
      { sessionId: "session-2" },
    ]);
  });

  test("an interrupted flush keeps every unpublished change queued", async () => {
    const { hub, store } = makeStore();

    for (let index = 0; index < 250; index++)
      await publish(store, numberedSocket(index));

    const started = Promise.withResolvers<void>();

    spyOn(hub, "publishPresence").mockImplementationOnce(() => {
      started.resolve();

      return new Promise(() => {});
    });

    const controller = new AbortController();

    const flushing = Effect.runPromiseExit(store.flushDeltas(), {
      signal: controller.signal,
    });

    await started.promise;
    controller.abort();
    await flushing;
    await flush(store);

    // Batches settling during the interruption may repeat; none may be lost.
    const delivered = new Set(
      deltaChanges(hub, "upsert").map((change) =>
        change.action === "upsert" ? change.presence.sessionId : undefined,
      ),
    );

    expect(delivered.size).toBe(250);
  });

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

  test("expires stale state and publishes a monotonic remove delta", async () => {
    let now = 1_000;
    const { hub, store } = makeStore({ now: () => now });
    await publish(store, socket(session([READ])));
    await flush(store);
    now = 61_001;
    await sweepExpired(store);
    await flush(store);
    const snapshot = await readSnapshot(store);
    expect(snapshot.presences).toEqual([]);
    expect(snapshot.revision).toBe(2);
    expect(hub.presenceEvents).toHaveLength(2);
    expect(hub.presenceEvents[1]?.basic).toMatchObject({
      data: {
        revision: 2,
        changes: [
          { action: "remove", userId: "user-1", discordId: "discord-1" },
        ],
      },
    });
  });

  test("clears published presence and coverage when all organization access is revoked", async () => {
    const coverage = new RecordingCoverage();
    const { store } = makeStore({ coverage });
    const publisher = socket(session([READ]));
    await publish(store, publisher, {
      location: { map: "Kwieciste Przejście" },
    });

    publisher.data.guilds = [];
    await expect(publish(store, publisher)).resolves.toBeUndefined();
    expect(publisher.data.presence).toBeUndefined();
    expect(await readSnapshot(store)).toMatchObject({ presences: [] });
    expect(coverage.events).toContainEqual({
      guildId: "organization-1",
      mapName: "Kwieciste Przejście",
      discordId: "discord-1",
      hasPlayer: false,
      isAfk: false,
    });
  });

  test.each<{ organizationIds: string[]; published: string[] }>([
    { organizationIds: [], published: [] },
    { organizationIds: ["organization-2"], published: ["organization-2"] },
    {
      organizationIds: ["organization-2", "unauthorized-organization"],
      published: ["organization-2"],
    },
  ])(
    "publishes only to the selected Lootlogs the session belongs to: %j",
    async ({ organizationIds, published }) => {
      const coverage = new RecordingCoverage();
      const { store } = makeStore({ coverage });
      const publisher = socket(session([READ]));
      publisher.data.guilds.push(secondGuild([READ]));
      await publish(store, publisher, {
        organizationIds,
        location: { map: "Kwieciste Przejście" },
      });

      expect(publisher.data.presence?.organizationIds ?? []).toEqual(published);

      for (const organizationId of [
        "organization-1",
        "organization-2",
        "unauthorized-organization",
      ]) {
        const snapshot = await readSnapshot(
          store,
          session([READ]),
          organizationId,
        );

        expect(snapshot.presences).toHaveLength(
          published.includes(organizationId) ? 1 : 0,
        );
      }

      expect(coverage.events.map(({ guildId }) => guildId)).toEqual(published);
    },
  );

  test("scopes snapshots and deltas to the receiving organization and stamps server lastSeen", async () => {
    const { hub, store } = makeStore();
    const publisher = socket(session([READ]));
    publisher.data.guilds.push(secondGuild([READ]));
    await publish(store, publisher, {
      clientObservedAt: 1,
      location: { map: "Target" },
    });
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));
    await flush(store);
    expect(publisher.data.presence?.organizationIds).toEqual([
      "organization-1",
      "organization-2",
    ]);

    for (const [index, organizationId] of [
      "organization-1",
      "organization-2",
    ].entries()) {
      for (const audience of ["basic", "precise"]) {
        const change = `${audience}.data.changes.0.presence`;

        expect(hub.presenceEvents[index]).toHaveProperty(
          `${change}.organizationIds`,
          [organizationId],
        );
        expect(hub.presenceEvents[index]).toHaveProperty(
          `${change}.lastSeen`,
          10_000,
        );
      }

      for (const permissions of [[READ], [READ, LOCATION]]) {
        const viewer = session(permissions);

        if (organizationId === "organization-2")
          viewer.guilds = [secondGuild(permissions)];

        const snapshot = await readSnapshot(store, viewer, organizationId);

        expect(snapshot.presences[0]?.organizationIds).toEqual([
          organizationId,
        ]);
      }
    }
  });

  test.each(["Target", "Other"])(
    "publishes coverage for a newly added organization on map %s",
    async (map) => {
      const coverage = new RecordingCoverage();
      const { store } = makeStore({ coverage });
      const publisher = socket(session([READ]));
      await publish(store, publisher, { location: { map: "Target" } });
      coverage.events.length = 0;
      publisher.data.guilds.push(secondGuild([READ]));
      await Effect.runPromise(store.reconcileAccess(publisher));
      await publish(store, publisher, { location: { map } });
      expect(
        coverage.events.filter((event) => event.guildId === "organization-2"),
      ).toEqual([
        {
          guildId: "organization-2",
          mapName: map,
          discordId: "discord-1",
          hasPlayer: true,
          isAfk: false,
        },
      ]);
      coverage.events.length = 0;
      await publish(store, publisher, { location: { map } });
      expect(coverage.events).toEqual([]);
    },
  );

  test("heartbeat removes revoked organizations and never recreates their presence", async () => {
    const coverage = new RecordingCoverage();
    const { store } = makeStore({ coverage });
    const publisher = socket(session([READ]));
    publisher.data.guilds.push(secondGuild([READ]));
    await publish(store, publisher, {
      location: { map: "Kwieciste Przejście" },
    });
    publisher.data.guilds = session([READ]).guilds;
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));

    expect(publisher.data.presence?.organizationIds).toEqual([
      "organization-1",
    ]);

    const revokedSnapshot = await readSnapshot(
      store,
      { ...session([READ]), guilds: [secondGuild([READ])] },
      "organization-2",
    );

    expect(revokedSnapshot.presences).toEqual([]);
    expect(coverage.events).toContainEqual({
      guildId: "organization-2",
      mapName: "Kwieciste Przejście",
      discordId: "discord-1",
      hasPlayer: false,
      isAfk: false,
    });
  });

  test("disconnect removes every organization's presence when a coverage event fails", async () => {
    const { store } = makeStore({
      coverage: {
        publish: (event) =>
          event.hasPlayer
            ? Effect.void
            : Effect.fail(new Error("Coverage unavailable")),
      },
    });

    const publisher = socket(session([READ]));
    publisher.data.guilds.push(secondGuild([READ]));
    await publish(store, publisher, {
      location: { map: "Kwieciste Przejście" },
    });

    const exit = await Effect.runPromiseExit(store.disconnect(publisher.data));

    expect(Exit.isFailure(exit)).toBe(true);
    expect((await readSnapshot(store)).presences).toEqual([]);

    const otherViewer = { ...session([READ]), guilds: [secondGuild([READ])] };
    const other = await readSnapshot(store, otherViewer, "organization-2");

    expect(other.presences).toEqual([]);
  });

  test("heartbeat refreshes stored presence without broadcasting an unchanged profile", async () => {
    let now = 10_000;
    const { hub, store } = makeStore({ now: () => now });
    const publisher = socket(session([READ]));
    await publish(store, publisher);
    await flush(store);
    hub.presenceEvents.length = 0;

    now = 20_000;
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));
    await flush(store);

    expect(hub.presenceEvents).toEqual([]);
    await expect(readSnapshot(store)).resolves.toMatchObject({
      presences: [{ lastSeen: 20_000 }],
    });
  });
});

test("expiry cleanup resumes after a transient Redis failure", async () => {
  let attempts = 0;

  class RecoveringRedis extends MemoryRedis {
    override async set(
      key: string,
      value: string,
      ...options: Array<string | number>
    ) {
      if (key === "presence:expiry:sweep-lock") {
        attempts++;

        if (attempts === 1) throw new Error("Redis temporarily unavailable");
      }

      return super.set(key, value, ...options);
    }
  }

  const store = new PresenceStore(
    { command: new RecoveringRedis() },
    new RecordingHub(),
    Date.now,
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      yield* store.runExpirySweep().pipe(Effect.forkScoped);
      yield* TestClock.adjust("5 seconds");
      expect(attempts).toBe(2);
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
  );
});

describe("game character offline grace", () => {
  test("publishes only after ten seconds, survives a new store instance and ignores web presence", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: GameCharacterOffline[] = [];

    const sweep = () =>
      sweepOffline(offlineStore(redis, () => now, events).store);

    const { store } = offlineStore(redis, () => now, events);
    const game = gameSocket();
    await publish(store, game);
    await disconnect(store, game);
    await publish(
      store,
      gameSocket({ connectionId: "web", platform: "web-app" }),
    );
    now = 9_999;
    await sweep();
    expect(events).toEqual([]);
    now = 10_000;
    await sweep();
    expect(events).toEqual([
      {
        userId: "user-1",
        discordId: "discord-1",
        world: "world-1",
        characterId: "character-1",
        organizationIds: ["organization-1"],
        disconnectedAt: 0,
      },
    ]);
    await sweep();
    expect(events).toHaveLength(1);
  });

  test("drains a disconnect burst when grace expires even after earlier sweeps saw only young entries", async () => {
    let now = 0;
    const { store, events } = offlineStore(new MemoryRedis(), () => now);

    for (let index = 0; index < 350; index++) {
      const game = gameSocket({
        userId: `user-${index}`,
        connectionId: `session-${index}`,
      });

      await publish(store, game);
      await disconnect(store, game);
    }

    now = 9_999;
    await sweepOffline(store);
    expect(events).toEqual([]);
    now = 10_000;
    await sweepOffline(store);
    expect(events).toHaveLength(350);
    expect(new Set(events.map(({ userId }) => userId)).size).toBe(350);
  });

  test("interrupts lease acquisition while Redis is unavailable", async () => {
    const started = Promise.withResolvers<void>();
    const stalled = Promise.withResolvers<string | null>();

    class StalledRedis extends MemoryRedis {
      override set(
        key: string,
        value: string,
        ...options: Array<string | number>
      ) {
        if (key === "presence:offline:sweep-lock") {
          started.resolve();

          return stalled.promise;
        }

        return super.set(key, value, ...options);
      }
    }

    const { store } = offlineStore(new StalledRedis(), () => 0);
    const fiber = Effect.runFork(store.sweepOffline());
    await started.promise;

    try {
      const interrupted = await Promise.race([
        Effect.runPromise(Fiber.interrupt(fiber)).then(() => true),
        Bun.sleep(100).then(() => false),
      ]);

      expect(interrupted).toBe(true);
    } finally {
      stalled.resolve(null);
      await Effect.runPromise(Fiber.interrupt(fiber));
    }
  });

  test("bounds lease release during shutdown when Redis stops responding", async () => {
    const started = Promise.withResolvers<void>();
    const stalled = Promise.withResolvers<void>();

    class StalledRedis extends MemoryRedis {
      override async eval<A>(
        script: string,
        numberOfKeys: number,
        ...parameters: Array<string | number>
      ): Promise<A> {
        if (script.includes("-- presence:lease-release")) {
          started.resolve();
          await stalled.promise;
        }

        return super.eval<A>(script, numberOfKeys, ...parameters);
      }
    }

    const { store } = offlineStore(new StalledRedis(), () => 0);

    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const fiber = yield* store.sweepOffline().pipe(Effect.forkScoped);
          yield* Effect.promise(() => started.promise);
          yield* TestClock.adjust("1 second");
          expect(fiber.pollUnsafe()?._tag).toBe("Success");
        }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
      );
    } finally {
      stalled.resolve();
    }
  });

  test("changing game character expires the old character while the new one stays online", async () => {
    let now = 0;
    const { store, events } = offlineStore(new MemoryRedis(), () => now);
    const game = gameSocket();
    await publish(store, game);
    game.data.character = { ...character, characterId: "other-character" };
    await publish(store, game);
    now = 10_000;
    await sweepOffline(store);
    expect(events.map((event) => event.characterId)).toEqual(["character-1"]);
  });
});
