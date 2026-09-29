import { describe, expect, spyOn, test } from "bun:test";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { Permission } from "@lootlog/schema/permissions";
import { Cause, Effect, Exit, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { PresenceStore } from "./presence-store.js";
import { RealtimeStoreError } from "./realtime-errors.js";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

class MemoryRedis {
  readonly values = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();
  readonly sortedSets = new Map<string, Map<string, number>>();
  readonly lists = new Map<string, string[]>();

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

    if (_script.includes("-- presence:refresh")) return this.refresh(args);

    if (_script.includes("-- presence:expiry-organization"))
      return this.expiryOrganization(args);

    if (_script.includes("-- presence:expiry-legacy-batch"))
      return this.expiryLegacyBatch(args);

    if (_script.includes("-- presence:expiry-index"))
      return this.indexExpiry(args, _numberOfKeys);

    if (_script.includes("-- presence:expiry-ready"))
      return this.expiryReady(args);

    if (_script.includes("-- presence:expiry-remove"))
      return this.removeExpired(args, _numberOfKeys);

    if (_script.includes("-- presence:remove"))
      return this.removePresence(args);

    if (_script.includes("-- presence:prune-organization")) {
      if (this.sets.get(args[0]!)?.size) return 0;

      return this.srem(args[1]!, args[2]!);
    }

    if (_script.includes("-- presence:offline-batch"))
      return this.readBatch(args);

    if (_script.includes("-- presence:offline-schedule"))
      return this.scheduleOffline(args);

    if (_script.includes("-- presence:offline-index-due"))
      return this.indexOfflineDue(args, _numberOfKeys);

    if (_script.includes("-- presence:offline-ready"))
      return this.readOfflineReady(args);

    if (_script.includes("-- presence:offline-drop"))
      return this.dropOffline(args);

    if (_script.includes("-- presence:offline-unindex-due"))
      return this.unindexOfflineDue(args);

    if (_script.includes("-- presence:offline-renew"))
      return Number(this.values.get(args[0]!) === args[1]);

    if (_script.includes("-- presence:offline-release"))
      return this.releaseOffline(args);

    if (_script.includes("-- presence:offline-ack"))
      return this.ackOffline(args);

    return this.claimOffline(args, _numberOfKeys);
  }

  private expiryOrganization(args: string[]): string {
    if (this.values.get(args[0]!) !== args[5]) return "";
    const current = this.values.get(args[4]!);

    if (current) return current;
    let pending = this.lists.get(args[3]!) ?? [];

    if (pending.length === 0) {
      const organizations = [...(this.sets.get(args[1]!) ?? [])];
      const cursor = Number(this.values.get(args[2]!) ?? 0);
      const size = Number(args[6]);
      pending = organizations.slice(cursor, cursor + size);
      this.values.set(
        args[2]!,
        String(cursor + size >= organizations.length ? 0 : cursor + size),
      );
    }

    const organization = pending.shift() ?? "";
    this.lists.set(args[3]!, pending);

    if (organization) this.values.set(args[4]!, organization);

    return organization;
  }

  private expiryLegacyBatch(args: string[]): string {
    if (this.values.get(args[0]!) !== args[6])
      return JSON.stringify({ keys: [], complete: false });
    const members = [...(this.sets.get(args[1]!) ?? [])];
    const cursor = Number(this.values.get(args[2]!) ?? 0);
    const size = Number(args[7]);
    const complete = cursor + size >= members.length;
    this.values.set(args[2]!, String(complete ? 0 : cursor + size));
    const due = this.sortedSets.get(args[4]!);

    const keys = members
      .slice(cursor, cursor + size)
      .filter(
        (key) =>
          !due?.has(
            JSON.stringify([args[8], key.slice(key.lastIndexOf(":") + 1)]),
          ),
      );

    if (complete) this.values.delete(args[5]!);

    return JSON.stringify({ keys, complete });
  }

  private indexExpiry(args: string[], numberOfKeys: number): number {
    const values = args.slice(numberOfKeys);

    if (this.values.get(args[0]!) !== values[0]) return 0;
    const due = this.sortedSets.get(args[1]!) ?? new Map<string, number>();

    for (let index = 2; index < numberOfKeys; index += 2) {
      const offset = 1 + ((index - 2) / 2) * 4;

      if (
        (this.values.get(args[index]!) ?? "") !== values[offset] ||
        (this.values.get(args[index + 1]!) ?? "") !== values[offset + 1]
      )
        continue;
      due.set(values[offset + 2]!, Number(values[offset + 3]));
    }

    this.sortedSets.set(args[1]!, due);

    return 1;
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

    if (
      this.values.get(args[0]!) !== values[0] ||
      this.values.get(args[5]!) !== values[0]
    )
      return 0;
    const score = this.sortedSets.get(args[4]!)?.get(values[3]!);

    if (score === undefined || score > Number(values[4])) return 0;

    if (
      (this.values.get(args[1]!) ?? "") !== values[1] ||
      (this.values.get(args[2]!) ?? "") !== values[2]
    )
      return 0;

    if (
      numberOfKeys > 6 &&
      !this.replaceExpiredDeparture(args, values, numberOfKeys)
    )
      return 0;

    this.values.delete(args[1]!);
    this.values.delete(args[2]!);
    this.sets.get(args[3]!)?.delete(values[5]!);
    this.sortedSets.get(args[4]!)?.delete(values[3]!);

    return 1;
  }

  private replaceExpiredDeparture(
    args: string[],
    values: string[],
    numberOfKeys: number,
  ): number {
    const count = numberOfKeys - 10;

    if ((this.sets.get(args[8]!)?.size ?? 0) !== count) return 0;

    for (let index = 10; index < numberOfKeys; index++) {
      if (
        (this.values.get(args[index]!) ?? "") !== values[index] ||
        !this.sets.get(args[8]!)?.has(values[index + count]!)
      )
        return 0;
    }

    for (let index = 10; index < numberOfKeys; index++) {
      this.values.delete(args[index]!);
      this.sets.get(args[7]!)?.delete(values[index + count]!);
      this.sets.get(args[8]!)?.delete(values[index + count]!);
      this.sortedSets.get(args[9]!)?.delete(values[index + count]!);
    }

    this.values.set(args[6]!, values[7]!);

    for (const key of [args[7]!, args[8]!]) {
      const set = this.sets.get(key) ?? new Set<string>();
      set.add(values[8]!);
      this.sets.set(key, set);
    }

    const due = this.sortedSets.get(args[9]!) ?? new Map<string, number>();
    due.set(values[8]!, Number(values[9]));
    this.sortedSets.set(args[9]!, due);

    return 1;
  }

  private async removePresence(args: string[]): Promise<number> {
    await this.del(args[0]!, args[1]!);
    await this.srem(args[2]!, args[4]!);
    this.sortedSets.get(args[3]!)?.delete(args[5]!);

    return 1;
  }

  private async refresh(args: string[]): Promise<string | number> {
    const key = args[0]!;
    await this.set(key, args[5]!);
    await this.set(args[1]!, args[7]!);

    if (!this.sets.get(args[2]!)?.has(args[8]!))
      await this.sadd(args[2]!, args[8]!);

    if (!this.sets.get(args[3]!)?.has(args[9]!))
      await this.sadd(args[3]!, args[9]!);
    const due = this.sortedSets.get(args[4]!) ?? new Map<string, number>();
    due.set(args[10]!, Number(args[11]));
    this.sortedSets.set(args[4]!, due);

    return 1;
  }

  private async scheduleOffline(args: string[]): Promise<string | number> {
    const key = args[0]!;

    await this.set(key, args[4]!);
    await this.sadd(args[1]!, args[5]!);
    await this.sadd(args[2]!, args[5]!);
    const due = this.sortedSets.get(args[3]!) ?? new Map<string, number>();
    due.set(args[5]!, Number(args[6]));
    this.sortedSets.set(args[3]!, due);

    return 1;
  }

  private async indexOfflineDue(
    args: string[],
    numberOfKeys: number,
  ): Promise<string | number> {
    const key = args[0]!;

    const values = args.slice(numberOfKeys);

    if (this.values.get(key) !== values[0]) return -1;
    const due = this.sortedSets.get(args[1]!) ?? new Map<string, number>();

    for (let index = 2; index < numberOfKeys; index++) {
      const offset = 1 + (index - 2) * 3;

      if (this.values.get(args[index]!) === values[offset])
        due.set(values[offset + 1]!, Number(values[offset + 2]));
    }

    this.sortedSets.set(args[1]!, due);

    return 1;
  }

  private async readOfflineReady(args: string[]): Promise<string | number> {
    const key = args[0]!;

    if (this.values.get(key) !== args[2]) return "[]";

    const entries =
      args[4] === "pending"
        ? [...(this.sortedSets.get(args[1]!) ?? [])]
            .filter(([, due]) => due <= Number(args[5]))
            .sort((left, right) => left[1] - right[1])
            .map(([member]) => member)
        : [...(this.sets.get(args[1]!) ?? [])];

    return JSON.stringify(entries.slice(0, Number(args[6])));
  }

  private async dropOffline(args: string[]): Promise<string | number> {
    const key = args[0]!;

    if (this.values.get(key) !== args[4]) return -1;

    if ((this.values.get(args[1]!) ?? "") !== args[5]) return 0;
    await this.del(args[1]!);
    await this.srem(args[2]!, args[6]!);
    this.sortedSets.get(args[3]!)?.delete(args[6]!);

    return 1;
  }

  private async unindexOfflineDue(args: string[]): Promise<string | number> {
    const key = args[0]!;

    let removed = 0;

    for (const member of args.slice(1))
      if (this.sortedSets.get(key)?.delete(member)) removed++;

    return removed;
  }

  private async releaseOffline(args: string[]): Promise<string | number> {
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
    const [lock, pendingIndex, outboxIndex, dueIndex] = args;
    const values = args.slice(_numberOfKeys);

    if (this.values.get(lock!) !== values[0]) return -1;
    let completed = 0;

    for (let index = 4; index < _numberOfKeys; index += 3) {
      const [pending, outbox, characterIndex] = args.slice(index, index + 3);
      const offset = 2 + ((index - 4) / 3) * 4;

      const [value, pendingMember, outboxMember, publish] = values.slice(
        offset,
        offset + 4,
      );

      if (this.values.get(pending!) !== value) continue;
      this.values.delete(pending!);
      this.sets.get(pendingIndex!)?.delete(pendingMember!);
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

  private readBatch(args: string[]): string {
    if (this.values.get(args[0]!) !== args[4])
      return JSON.stringify({ keys: [], complete: true });
    const members = [...(this.sets.get(args[1]!) ?? [])];
    const cursor = Number(this.values.get(args[2]!) ?? 0);
    const size = Number(args[5]);
    this.values.set(
      args[2]!,
      String(cursor + size >= members.length ? 0 : cursor + size),
    );

    return JSON.stringify({
      keys: members.slice(cursor, cursor + size),
      complete: cursor + size >= members.length,
    });
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
  readonly instanceId = "00000000-0000-4000-8000-000000000001";

  readonly presenceEvents: Array<{
    readonly basic: PresenceEvent;
    readonly precise: PresenceEvent;
  }> = [];

  setPresence(socket: GatewaySocket, presence: SessionData["presence"]): void {
    socket.data.presence = presence;
  }

  async publishPresence(
    _scope: Parameters<RealtimeHub["publishPresence"]>[0],
    basic: Parameters<RealtimeHub["publishPresence"]>[1],
    precise: Parameters<RealtimeHub["publishPresence"]>[2],
  ): Promise<void> {
    this.presenceEvents.push({ basic, precise });
  }
}

const deltaChanges = (hub: RecordingHub, action: "upsert" | "remove") =>
  hub.presenceEvents.flatMap(({ basic }) =>
    basic.type === "presence.delta"
      ? basic.data.changes.filter((change) => change.action === action)
      : [],
  );

const flush = (store: PresenceStore) => Effect.runPromise(store.flushDeltas());

class RecordingCoverage {
  readonly events: Array<{
    readonly guildId: string;
    readonly mapName: string;
    readonly discordId: string;
    readonly hasPlayer: boolean;
    readonly isAfk?: boolean;
  }> = [];

  publish(event: {
    readonly guildId: string;
    readonly mapName: string;
    readonly discordId: string;
    readonly hasPlayer: boolean;
    readonly isAfk?: boolean;
  }): Effect.Effect<void> {
    return Effect.sync(() => {
      this.events.push(event);
    });
  }
}

const session = (permissions: Permission[]): SessionData => ({
  discordId: "discord-1",
  userId: "user-1",
  connectionId: "session-1",
  platform: "game",
  joined: true,
  guilds: [
    {
      guild: { id: "organization-1", ownerId: "someone-else" },
      roles: [{ id: "role-1", lvlRangeFrom: 0, lvlRangeTo: 500, permissions }],
    },
  ],
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "reported",
});

const socket = (data: SessionData): GatewaySocket => ({
  data,
  send: () => 0,
  close: () => {},
  getBufferedAmount: () => 0,
});

const secondGuild = (permissions: Permission[]) => ({
  guild: { id: "organization-2", ownerId: "someone-else" },
  roles: [{ id: "role-2", lvlRangeFrom: 0, lvlRangeTo: 500, permissions }],
});

describe("PresenceStore", () => {
  test.each(["publish", "disconnect"])(
    "follows a snapshot shared across a %s with a newer delta, then reads again",
    async (mutation) => {
      let now = 10_000;
      const redis = new MemoryRedis();
      const hub = new RecordingHub();
      const store = new PresenceStore({ command: redis }, hub, () => now);
      const viewer = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);
      const publisher = socket(viewer);
      await Effect.runPromise(
        store.publish(publisher, { organizationIds: ["organization-1"] }),
      );
      await flush(store);
      const started = Promise.withResolvers<void>();
      const gate = Promise.withResolvers<void>();
      const originalMget = redis.mget.bind(redis);
      spyOn(redis, "mget").mockImplementationOnce(async (keys) => {
        const values = await originalMget(keys);
        started.resolve();
        await gate.promise;

        return values;
      });
      const first = Effect.runPromise(store.snapshot(viewer, "organization-1"));
      await started.promise;
      now = 11_000;

      if (mutation === "publish") {
        await Effect.runPromise(
          store.publish(publisher, {
            organizationIds: ["organization-1"],
            isAfk: true,
          }),
        );
      } else {
        await Effect.runPromise(store.disconnect(viewer));
      }

      // The change is stored but not yet announced, so the revision is unchanged.
      const joined = Effect.runPromise(
        store.snapshot(viewer, "organization-1"),
      );

      gate.resolve();

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

      const after = await Effect.runPromise(
        store.snapshot(viewer, "organization-1"),
      );

      expect(after.revision).toBe(2);
      expect(after.presences).toEqual(
        mutation === "publish"
          ? [expect.objectContaining({ isAfk: true })]
          : [],
      );
    },
  );

  test("announces a write that settles after its caller was interrupted", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => 10_000);
    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    await Effect.runPromise(store.publish(publisher, { organizationIds: [] }));
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
      store.publish(publisher, { organizationIds: [], isAfk: true }),
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
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => 10_000);
    const viewer = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);
    const mget = spyOn(redis, "mget");
    const incr = spyOn(redis, "incr");

    const join = async (index: number) => {
      const joining = socket({
        ...viewer,
        connectionId: `session-${index}`,
        userId: `user-${index}`,
        discordId: `discord-${index}`,
      });

      await Effect.runPromise(store.publish(joining, { organizationIds: [] }));
      // Every joining client fetches the Organization snapshot.
      await Effect.runPromise(store.snapshot(joining.data, "organization-1"));
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
    const hub = new RecordingHub();

    const store = new PresenceStore(
      { command: new MemoryRedis() },
      hub,
      () => 10_000,
    );

    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    await Effect.runPromise(store.publish(publisher, { organizationIds: [] }));
    await Effect.runPromise(
      store.publish(publisher, { organizationIds: [], isAfk: true }),
    );
    await flush(store);
    expect(deltaChanges(hub, "upsert")).toMatchObject([
      { presence: { sessionId: "session-1", isAfk: true } },
    ]);

    hub.presenceEvents.length = 0;
    await Effect.runPromise(
      store.publish(publisher, { organizationIds: [], isAfk: false }),
    );
    await Effect.runPromise(store.disconnect(publisher.data));
    await flush(store);
    expect(hub.presenceEvents).toHaveLength(1);
    expect(deltaChanges(hub, "upsert")).toEqual([]);
    expect(deltaChanges(hub, "remove")).toMatchObject([
      { sessionId: "session-1" },
    ]);
  });

  test("retries a failed delta without overriding a newer change", async () => {
    const hub = new RecordingHub();

    const store = new PresenceStore(
      { command: new MemoryRedis() },
      hub,
      () => 10_000,
    );

    const first = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));

    const second = socket({
      ...session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      connectionId: "session-2",
    });

    await Effect.runPromise(store.publish(first, { organizationIds: [] }));
    await Effect.runPromise(store.publish(second, { organizationIds: [] }));
    spyOn(hub, "publishPresence").mockImplementationOnce(async () => {
      // A departure queued while the failed flush is in flight is newer.
      await Effect.runPromise(store.disconnect(second.data));
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
    const hub = new RecordingHub();

    const store = new PresenceStore(
      { command: new MemoryRedis() },
      hub,
      () => 10_000,
    );

    for (let index = 0; index < 250; index++)
      await Effect.runPromise(
        store.publish(
          socket({
            ...session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
            connectionId: `session-${index}`,
          }),
          { organizationIds: [] },
        ),
      );

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
      const redis = new MemoryRedis();

      const store = new PresenceStore(
        { command: redis },
        new RecordingHub(),
        () => 10_000,
      );

      const viewer = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);
      const publisher = socket(viewer);
      await Effect.runPromise(
        store.publish(publisher, { organizationIds: ["organization-1"] }),
      );
      await flush(store);
      redis.values.set(
        "presence:organization-1:session-1",
        JSON.stringify({ ...viewer.presence, discordId: undefined }),
      );
      const metadataStarted = Promise.withResolvers<void>();
      const metadataGate = Promise.withResolvers<void>();
      const replacementStarted = Promise.withResolvers<void>();
      const replacementGate = Promise.withResolvers<void>();
      const originalGet = redis.get.bind(redis);
      const originalMget = redis.mget.bind(redis);
      spyOn(redis, "get").mockImplementation(async (key) => {
        if (key.startsWith("presence:metadata:")) {
          metadataStarted.resolve();
          await metadataGate.promise;
        }

        return originalGet(key);
      });
      let reads = 0;
      spyOn(redis, "mget").mockImplementation(async (keys) => {
        reads++;

        if (reads === 2) {
          replacementStarted.resolve();
          await replacementGate.promise;
        }

        return originalMget(keys);
      });

      const first = Effect.runPromiseExit(
        store.snapshot(viewer, "organization-1"),
      );

      try {
        await metadataStarted.promise;
        await Effect.runPromise(
          store.publish(publisher, {
            organizationIds: ["organization-1"],
            isAfk: true,
          }),
        );
        await flush(store);

        const replacement = Effect.runPromise(
          store.snapshot(viewer, "organization-1"),
        );

        await replacementStarted.promise;

        if (outcome === "success") metadataGate.resolve();
        else metadataGate.reject(new Error("Legacy metadata read failed"));
        await first;

        const follower = Effect.runPromise(
          store.snapshot(viewer, "organization-1"),
        );

        replacementGate.resolve();
        const snapshots = await Promise.all([replacement, follower]);
        expect(reads).toBe(2);

        for (const snapshot of snapshots) {
          expect(snapshot.presences[0]?.isAfk).toBe(true);
          expect(snapshot.revision).toBe(2);
        }
      } finally {
        metadataGate.resolve();
        replacementGate.resolve();
        await first;
      }
    },
  );

  test.each(["smembers", "mget", "metadata"])(
    "bounds a stalled %s read and allows a fresh snapshot without waiting for it to settle",
    async (stage) => {
      const redis = new MemoryRedis();

      const store = new PresenceStore(
        { command: redis },
        new RecordingHub(),
        () => 10_000,
      );

      const viewer = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);
      await Effect.runPromise(
        store.publish(socket(viewer), { organizationIds: ["organization-1"] }),
      );
      await flush(store);
      redis.values.set(
        "presence:organization-1:session-1",
        JSON.stringify({ ...viewer.presence, discordId: undefined }),
      );
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
      const originalGet = redis.get.bind(redis);
      spyOn(redis, "smembers").mockImplementation(async (key) => {
        await pause("smembers");

        return originalSmembers(key);
      });
      spyOn(redis, "mget").mockImplementation(async (keys) => {
        await pause("mget");

        return originalMget(keys);
      });
      spyOn(redis, "get").mockImplementation(async (key) => {
        if (key.startsWith("presence:metadata:")) await pause("metadata");

        return originalGet(key);
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
    const redis = new MemoryRedis();

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => 10_000,
    );

    const publisher = socket({
      ...session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
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

    await Effect.runPromise(
      store.publish(publisher, {
        organizationIds: ["organization-1", "organization-2"],
        location: { mapId: 42, map: "Target", x: 4, y: 7 },
      }),
    );
    const gate = Promise.withResolvers<void>();
    const originalMget = redis.mget.bind(redis);

    const mget = spyOn(redis, "mget").mockImplementation(async (keys) => {
      await gate.promise;

      return originalMget(keys);
    });

    const smembers = spyOn(redis, "smembers");
    const basic = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);

    const precise = session([
      Permission.LOOTLOG_ONLINE_PLAYERS_READ,
      Permission.LOOTLOG_PRESENCE_LOCATION_READ,
    ]);

    const snapshots = Promise.all([
      Effect.runPromise(store.snapshot(basic, "organization-1", "world-1")),
      Effect.runPromise(store.snapshot(precise, "organization-1", "world-1")),
      Effect.runPromise(
        store.snapshot(precise, "organization-1", "other-world"),
      ),
      Effect.runPromise(store.snapshot(basic, "organization-2")),
    ]);

    gate.resolve();
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
    expect(mget).toHaveBeenCalledTimes(2);
    await Effect.runPromise(store.snapshot(basic, "organization-1"));
    expect(mget).toHaveBeenCalledTimes(2);
  });

  test.each(["initiator", "follower"])(
    "cancelling the %s does not cancel another viewer's snapshot",
    async (cancelled) => {
      const redis = new MemoryRedis();

      const store = new PresenceStore(
        { command: redis },
        new RecordingHub(),
        () => 10_000,
      );

      const viewer = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);
      await Effect.runPromise(
        store.publish(socket(viewer), { organizationIds: ["organization-1"] }),
      );
      const gate = Promise.withResolvers<void>();
      const started = Promise.withResolvers<void>();
      const originalMget = redis.mget.bind(redis);

      const mget = spyOn(redis, "mget").mockImplementation(async (keys) => {
        started.resolve();
        await gate.promise;

        return originalMget(keys);
      });

      const controller = new AbortController();

      const first = Effect.runPromiseExit(
        store.snapshot(viewer, "organization-1"),
        cancelled === "initiator" ? { signal: controller.signal } : undefined,
      );

      await started.promise;

      const second = Effect.runPromiseExit(
        store.snapshot(viewer, "organization-1"),
        cancelled === "follower" ? { signal: controller.signal } : undefined,
      );

      controller.abort();
      const interrupted = await (cancelled === "initiator" ? first : second);
      expect(interrupted._tag).toBe("Failure");
      gate.resolve();
      const surviving = await (cancelled === "initiator" ? second : first);
      expect(Exit.isSuccess(surviving)).toBe(true);

      if (Exit.isSuccess(surviving)) {
        expect(surviving.value.presences).toMatchObject([
          { sessionId: "session-1" },
        ]);
      }

      expect(mget).toHaveBeenCalledTimes(1);
      await Effect.runPromise(store.snapshot(viewer, "organization-1"));
      expect(mget).toHaveBeenCalledTimes(1);
    },
  );

  test.each(["smembers", "mget"] as const)(
    "shares %s failures without caching them after Redis recovers",
    async (operation) => {
      const redis = new MemoryRedis();

      const store = new PresenceStore(
        { command: redis },
        new RecordingHub(),
        () => 10_000,
      );

      const viewer = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);
      await Effect.runPromise(
        store.publish(socket(viewer), { organizationIds: ["organization-1"] }),
      );
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

      const recovered = await Effect.runPromise(
        store.snapshot(viewer, "organization-1"),
      );

      expect(recovered.presences).toHaveLength(1);
      expect(recovered.revision).toBe(1);
    },
  );

  test("keeps permission checks current and reads updates, disconnects and expiry after shared reads settle", async () => {
    let now = 10_000;
    const redis = new MemoryRedis();

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
    );

    const viewer = session([
      Permission.LOOTLOG_ONLINE_PLAYERS_READ,
      Permission.LOOTLOG_PRESENCE_LOCATION_READ,
    ]);

    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    const location = { mapId: 42, map: "Target", x: 4, y: 7 };
    await Effect.runPromise(
      store.publish(publisher, {
        organizationIds: ["organization-1"],
        location,
      }),
    );
    const gate = Promise.withResolvers<void>();
    const started = Promise.withResolvers<void>();
    const originalMget = redis.mget.bind(redis);
    spyOn(redis, "mget").mockImplementation(async (keys) => {
      started.resolve();
      await gate.promise;

      return originalMget(keys);
    });

    const snapshots = Promise.all([
      Effect.runPromise(store.snapshot(viewer, "organization-1")),
      Effect.runPromise(store.snapshot(viewer, "organization-1")),
    ]);

    await started.promise;
    viewer.guilds = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]).guilds;
    gate.resolve();

    for (const snapshot of await snapshots)
      expect(snapshot.presences[0]).not.toHaveProperty("location");

    await Effect.runPromise(
      store.publish(publisher, {
        organizationIds: ["organization-1"],
        location,
        isAfk: true,
      }),
    );
    await flush(store);
    expect(
      await Effect.runPromise(store.snapshot(viewer, "organization-1")),
    ).toMatchObject({ revision: 1, presences: [{ isAfk: true }] });

    now += PRESENCE_EXPIRY_MS;
    expect(
      (await Effect.runPromise(store.snapshot(viewer, "organization-1")))
        .presences,
    ).toEqual([]);
    await Effect.runPromise(
      store.publish(publisher, { organizationIds: ["organization-1"] }),
    );
    await flush(store);
    expect(
      (await Effect.runPromise(store.snapshot(viewer, "organization-1")))
        .presences,
    ).toHaveLength(1);
    await Effect.runPromise(store.disconnect(publisher.data));
    await flush(store);
    expect(
      (await Effect.runPromise(store.snapshot(viewer, "organization-1")))
        .presences,
    ).toEqual([]);
  });

  test("batches map metadata while ignoring missing, malformed and other-map sessions", async () => {
    const redis = new MemoryRedis();

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => 10_000,
    );

    for (let index = 0; index < 5; index++) {
      const data = {
        ...session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
        connectionId: `session-${index}`,
        discordId: `discord-${index}`,
      };

      await Effect.runPromise(
        store.publish(socket(data), {
          organizationIds: ["organization-1"],
          isAfk: index === 1,
          location: {
            mapId: index === 4 ? 2 : 1,
            map: index === 4 ? "Other" : "Target",
            x: 1,
            y: 1,
          },
        }),
      );
    }

    redis.values.delete("presence:metadata:organization-1:session-2");
    redis.values.set("presence:metadata:organization-1:session-3", "invalid");
    const get = spyOn(redis, "get");
    const mget = spyOn(redis, "mget");
    expect(
      await Effect.runPromise(store.coverageForMap("organization-1", "Target")),
    ).toEqual([
      { discordId: "discord-0", isAfk: false },
      { discordId: "discord-1", isAfk: true },
    ]);
    expect(get).not.toHaveBeenCalled();
    expect(mget).toHaveBeenCalledTimes(2);
    expect(mget.mock.calls[1]?.[0]).toHaveLength(4);
    mget.mockClear();
    expect(
      await Effect.runPromise(store.coverageForMap("organization-1", "Empty")),
    ).toEqual([]);
    expect(mget).toHaveBeenCalledTimes(1);
  });

  test("uses server lastSeen and separates basic from precise location", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => 10_000);
    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    await Effect.runPromise(
      store.publish(publisher, {
        organizationIds: ["organization-1", "unauthorized-organization"],
        isAfk: false,
        clientObservedAt: 1,
        location: { mapId: 42, map: "Kwieciste Przejście", x: 4, y: 7 },
      }),
    );

    // Simulate an unexpired presence written by the previous gateway version.
    const presenceKey = "presence:organization-1:session-1";
    const stored = JSON.parse(redis.values.get(presenceKey) ?? "{}");
    expect(stored).toMatchObject({ userId: "user-1", discordId: "discord-1" });
    delete stored.discordId;
    redis.values.set(presenceKey, JSON.stringify(stored));

    const basic = await Effect.runPromise(
      store.snapshot(
        session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
        "organization-1",
      ),
    );

    const precise = await Effect.runPromise(
      store.snapshot(
        session([
          Permission.LOOTLOG_ONLINE_PLAYERS_READ,
          Permission.LOOTLOG_PRESENCE_LOCATION_READ,
        ]),
        "organization-1",
      ),
    );

    expect(basic.presences[0]).toMatchObject({
      userId: "user-1",
      discordId: "discord-1",
    });
    expect(basic.presences[0]?.lastSeen).toBe(10_000);
    expect("location" in (basic.presences[0] ?? {})).toBe(false);
    expect(precise.presences[0]).toHaveProperty("location.mapId", 42);
    expect(precise.presences[0]?.organizationIds).toEqual(["organization-1"]);
    await flush(store);
    expect(hub.presenceEvents).toHaveLength(1);
  });

  test("expires stale state and publishes a monotonic remove delta", async () => {
    let now = 1_000;
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => now);
    await Effect.runPromise(
      store.publish(socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ])), {
        organizationIds: ["organization-1"],
      }),
    );
    await flush(store);
    now = 61_001;
    await Effect.runPromise(store.sweepExpired());
    await flush(store);

    const snapshot = await Effect.runPromise(
      store.snapshot(
        session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
        "organization-1",
      ),
    );

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

  test("does not fetch active payloads while draining a burst in bounded candidate batches", async () => {
    let now = 1_000;
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => now);
    const viewer = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);

    for (let index = 0; index < 205; index++) {
      await Effect.runPromise(
        store.publish(
          socket({
            ...viewer,
            connectionId: `burst-${index}`,
            userId: `user-${index}`,
          }),
          { organizationIds: [] },
        ),
      );
    }

    await flush(store);
    hub.presenceEvents.length = 0;
    const mget = spyOn(redis, "mget");
    await Effect.runPromise(store.sweepExpired());
    await flush(store);
    expect(mget).not.toHaveBeenCalled();
    expect(hub.presenceEvents).toEqual([]);

    now += PRESENCE_EXPIRY_MS;
    await Effect.runPromise(store.sweepExpired());
    await flush(store);
    expect(mget.mock.calls.every(([keys]) => keys.length <= 200)).toBe(true);
    expect(deltaChanges(hub, "remove")).toHaveLength(205);
    expect(
      (await Effect.runPromise(store.snapshot(viewer, "organization-1")))
        .presences,
    ).toEqual([]);
    await Effect.runPromise(store.sweepExpired());
    await flush(store);
    expect(deltaChanges(hub, "remove")).toHaveLength(205);
  });

  test("a heartbeat after expiry capture keeps the session and suppresses a remove delta", async () => {
    let now = 1_000;
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => now);
    const game = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    await flush(store);
    now += PRESENCE_EXPIRY_MS;
    const evaluate = redis.eval.bind(redis);
    let refreshed = false;
    spyOn(redis, "eval").mockImplementation(
      async (script, numberOfKeys, ...parameters) => {
        if (!refreshed && script.includes("-- presence:expiry-remove")) {
          refreshed = true;
          await Effect.runPromise(
            store.heartbeat(game, game.data.connectionId),
          );
        }

        return evaluate(script, numberOfKeys, ...parameters);
      },
    );
    await Effect.runPromise(store.sweepExpired());
    await flush(store);
    expect(deltaChanges(hub, "remove")).toEqual([]);
    expect(
      (await Effect.runPromise(store.snapshot(game.data, "organization-1")))
        .presences,
    ).toMatchObject([{ lastSeen: now }]);
  });

  test("an older writer's fresh metadata repairs an early deadline after payload eviction", async () => {
    let now = 1_000;
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => now);
    const game = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    await flush(store);
    const oldDue = new Map(redis.sortedSets.get("presence:expiry:due"));
    now += PRESENCE_EXPIRY_MS - 1_000;
    await Effect.runPromise(store.heartbeat(game, game.data.connectionId));
    redis.sortedSets.set("presence:expiry:due", oldDue);
    redis.values.delete("presence:organization-1:session-1");
    now += 1_000;
    await Effect.runPromise(store.sweepExpired());
    await flush(store);
    expect(deltaChanges(hub, "remove")).toEqual([]);
    expect(
      await redis.get("presence:metadata:organization-1:session-1"),
    ).not.toBeNull();
    now += PRESENCE_EXPIRY_MS;
    await Effect.runPromise(store.sweepExpired());
    await flush(store);
    expect(deltaChanges(hub, "remove")).toHaveLength(1);
    expect(
      await redis.get("presence:metadata:organization-1:session-1"),
    ).toBeNull();
  });

  test("clears published presence and coverage when all organization access is revoked", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const coverage = new RecordingCoverage();
    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));

    const store = new PresenceStore(
      { command: redis },
      hub,
      () => 10_000,
      coverage,
    );

    await Effect.runPromise(
      store.publish(publisher, {
        organizationIds: ["organization-1"],
        location: { map: "Kwieciste Przejście" },
      }),
    );

    publisher.data.guilds = [];
    await expect(
      Effect.runPromise(store.publish(publisher, { organizationIds: [] })),
    ).resolves.toBeUndefined();
    expect(publisher.data.presence).toBeUndefined();
    expect(
      await Effect.runPromise(
        store.snapshot(
          session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
          "organization-1",
        ),
      ),
    ).toMatchObject({ presences: [] });
    expect(coverage.events).toContainEqual({
      guildId: "organization-1",
      mapName: "Kwieciste Przejście",
      discordId: "discord-1",
      hasPlayer: false,
      isAfk: false,
    });
  });

  test.each([
    { organizationIds: [] },
    { organizationIds: ["organization-1"] },
    { organizationIds: ["unauthorized-organization"] },
  ])(
    "publishes to every authorized organization despite client selection %j",
    async ({ organizationIds }) => {
      const redis = new MemoryRedis();
      const hub = new RecordingHub();
      const coverage = new RecordingCoverage();

      const publisher = socket(
        session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      );

      publisher.data.guilds.push(
        secondGuild([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      );

      const store = new PresenceStore(
        { command: redis },
        hub,
        () => 10_000,
        coverage,
      );

      await Effect.runPromise(
        store.publish(publisher, {
          organizationIds,
          location: { map: "Kwieciste Przejście" },
        }),
      );

      expect(publisher.data.presence?.organizationIds).toEqual([
        "organization-1",
        "organization-2",
      ]);

      for (const organizationId of ["organization-1", "organization-2"]) {
        const snapshot = await Effect.runPromise(
          store.snapshot(publisher.data, organizationId),
        );

        expect(snapshot.presences).toHaveLength(1);
        expect(coverage.events).toContainEqual({
          guildId: organizationId,
          mapName: "Kwieciste Przejście",
          discordId: "discord-1",
          hasPlayer: true,
          isAfk: false,
        });
      }

      await flush(store);
      expect(hub.presenceEvents).toHaveLength(2);
      expect(
        await Effect.runPromise(
          store.snapshot(publisher.data, "unauthorized-organization"),
        ),
      ).toMatchObject({ presences: [] });
    },
  );

  test("scopes snapshots, legacy records and deltas to the receiving organization", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore({ command: redis }, hub, () => 10_000);
    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    publisher.data.guilds.push(
      secondGuild([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
    );
    await Effect.runPromise(
      store.publish(publisher, {
        organizationIds: [],
        location: { map: "Target" },
      }),
    );
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
        expect(hub.presenceEvents[index]).toHaveProperty(
          `${audience}.data.changes.0.presence.organizationIds`,
          [organizationId],
        );
      }

      // A rolling deployment can leave records from the previous gateway in Redis.
      await redis.set(
        `presence:${organizationId}:session-1`,
        JSON.stringify(publisher.data.presence),
      );

      for (const permissions of [
        [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
        [
          Permission.LOOTLOG_ONLINE_PLAYERS_READ,
          Permission.LOOTLOG_PRESENCE_LOCATION_READ,
        ],
      ]) {
        const viewer = session(permissions);

        if (organizationId === "organization-2")
          viewer.guilds = [secondGuild(permissions)];

        const snapshot = await Effect.runPromise(
          store.snapshot(viewer, organizationId),
        );

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

      const store = new PresenceStore(
        { command: new MemoryRedis() },
        new RecordingHub(),
        () => 10_000,
        coverage,
      );

      const publisher = socket(
        session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      );

      await Effect.runPromise(
        store.publish(publisher, {
          organizationIds: [],
          location: { map: "Target" },
        }),
      );
      coverage.events.length = 0;
      publisher.data.guilds.push(
        secondGuild([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      );
      await Effect.runPromise(store.reconcileAccess(publisher));
      await Effect.runPromise(
        store.publish(publisher, { organizationIds: [], location: { map } }),
      );
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
      await Effect.runPromise(
        store.publish(publisher, { organizationIds: [], location: { map } }),
      );
      expect(coverage.events).toEqual([]);
    },
  );

  test("heartbeat removes revoked organizations and never recreates their presence", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const coverage = new RecordingCoverage();
    const publisherData = session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);
    publisherData.guilds.push(
      secondGuild([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
    );
    const publisher = socket(publisherData);

    const store = new PresenceStore(
      { command: redis },
      hub,
      () => 10_000,
      coverage,
    );

    await Effect.runPromise(
      store.publish(publisher, {
        organizationIds: ["organization-1", "organization-2"],
        location: { map: "Kwieciste Przejście" },
      }),
    );

    const retainedGuild = publisher.data.guilds[0];

    if (!retainedGuild) throw new Error("Expected the retained organization");
    publisher.data.guilds = [retainedGuild];
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));

    expect(publisher.data.presence?.organizationIds).toEqual([
      "organization-1",
    ]);

    const revokedSnapshot = await Effect.runPromise(
      store.snapshot(
        {
          ...session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
          guilds: [secondGuild([Permission.LOOTLOG_ONLINE_PLAYERS_READ])],
        },
        "organization-2",
      ),
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

  test("heartbeat refreshes stored presence without broadcasting an unchanged profile", async () => {
    let now = 10_000;
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    const store = new PresenceStore({ command: redis }, hub, () => now);
    await Effect.runPromise(
      store.publish(publisher, { organizationIds: ["organization-1"] }),
    );
    await flush(store);
    hub.presenceEvents.length = 0;

    now = 20_000;
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));
    await flush(store);

    expect(hub.presenceEvents).toEqual([]);
    await expect(
      Effect.runPromise(
        store.snapshot(
          session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
          "organization-1",
        ),
      ),
    ).resolves.toMatchObject({ presences: [{ lastSeen: 20_000 }] });
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
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      yield* store.runExpirySweep().pipe(Effect.forkScoped);
      yield* TestClock.adjust(store.sweepSchedule);
      expect(attempts).toBe(2);
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
  );
});

describe("game character offline grace", () => {
  const character = {
    name: "Player",
    characterId: "character-1",
    accountId: "account-1",
    world: "world-1",
    lvl: 100,
    prof: "w",
    icon: "player.gif",
  };

  test("publishes only after ten seconds, survives a new store instance and ignores web presence", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    let now = 0;
    const events: unknown[] = [];

    const makeStore = () =>
      new PresenceStore(
        { command: redis },
        hub,
        () => now,
        undefined,
        undefined,
        (event) =>
          Effect.sync(() => {
            events.push(event);
          }),
      );

    const first = makeStore();
    const game = socket({ ...session([]), character });
    await Effect.runPromise(first.publish(game, { organizationIds: [] }));
    await Effect.runPromise(first.disconnect(game.data));

    const web = socket({
      ...session([]),
      connectionId: "web",
      platform: "web-app",
      character,
    });

    await Effect.runPromise(first.publish(web, { organizationIds: [] }));
    now = 9_999;
    await Effect.runPromise(makeStore().sweepOffline());
    expect(events).toEqual([]);
    now = 10_000;
    await Effect.runPromise(makeStore().sweepOffline());
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
    await Effect.runPromise(makeStore().sweepOffline());
    expect(events).toHaveLength(1);
  });

  test("drains a disconnect burst when grace expires even after earlier sweeps saw only young entries", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: Array<{ userId: string }> = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    for (let index = 0; index < 350; index++) {
      const game = socket({
        ...session([]),
        userId: `user-${index}`,
        connectionId: `session-${index}`,
        character,
      });

      await Effect.runPromise(store.publish(game, { organizationIds: [] }));
      await Effect.runPromise(store.disconnect(game.data));
    }

    now = 9_999;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toEqual([]);
    now = 10_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toHaveLength(350);
    expect(new Set(events.map(({ userId }) => userId)).size).toBe(350);
  });

  test("drops malformed pending and outbox records while valid departures continue", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: unknown[] = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    const game = socket({ ...session([]), character });
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    await Effect.runPromise(store.disconnect(game.data));

    for (const index of ["pending", "outbox"]) {
      await redis.set(`invalid-${index}`, '{"userId":"old-schema"}');
      await redis.sadd(`presence:offline:${index}`, `invalid-${index}`);
    }

    now = 10_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toHaveLength(1);

    for (const index of ["pending", "outbox"]) {
      expect(await redis.get(`invalid-${index}`)).toBeNull();
      expect(await redis.smembers(`presence:offline:${index}`)).toEqual([]);
    }

    // A later sweep remains usable after malformed persisted values.
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    await Effect.runPromise(store.disconnect(game.data));
    now += 10_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toHaveLength(2);
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

    const store = new PresenceStore(
      { command: new StalledRedis() },
      new RecordingHub(),
      () => 0,
      undefined,
      undefined,
      () => Effect.void,
    );

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
        if (script.includes("-- presence:offline-release")) {
          started.resolve();
          await stalled.promise;
        }

        return super.eval<A>(script, numberOfKeys, ...parameters);
      }
    }

    const store = new PresenceStore(
      { command: new StalledRedis() },
      new RecordingHub(),
      () => 0,
      undefined,
      undefined,
      () => Effect.void,
    );

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

  test("does not publish captured outbox records after losing the lease during their read", async () => {
    let replaceLease = true;

    class LeaseLosingRedis extends MemoryRedis {
      override async mget(keys: string[]): Promise<Array<string | null>> {
        const values = await super.mget(keys);

        if (replaceLease && keys.includes("outbox-departure")) {
          replaceLease = false;
          await this.set("presence:offline:sweep-lock", "successor");
        }

        return values;
      }
    }

    const redis = new LeaseLosingRedis();
    const events: unknown[] = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => 10_000,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    const departure = {
      userId: "user-1",
      discordId: "discord-1",
      world: character.world,
      characterId: character.characterId,
      organizationIds: ["organization-1"],
      disconnectedAt: 0,
    };

    await redis.set("outbox-departure", JSON.stringify(departure));
    await redis.sadd("presence:offline:outbox", "outbox-departure");
    await Effect.runPromise(store.sweepOffline());
    expect(events).toEqual([]);
    expect(await redis.get("outbox-departure")).toBe(JSON.stringify(departure));
    expect(await redis.smembers("presence:offline:outbox")).toEqual([
      "outbox-departure",
    ]);
    expect(await redis.get("presence:offline:sweep-lock")).toBe("successor");

    await redis.del("presence:offline:sweep-lock");
    await Effect.runPromise(store.sweepOffline());
    expect(events).toEqual([departure]);
    expect(await redis.smembers("presence:offline:outbox")).toEqual([]);
  });

  test("stops publishing as soon as an acknowledgement loses its lease", async () => {
    const redis = new MemoryRedis();
    const events: unknown[] = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => 10_000,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
          redis.values.set("presence:offline:sweep-lock", "successor");
        }),
    );

    for (let index = 0; index < 2; index++) {
      const key = `outbox-${index}`;
      await redis.set(
        key,
        JSON.stringify({
          userId: `user-${index}`,
          discordId: "discord-1",
          world: character.world,
          characterId: character.characterId,
          organizationIds: ["organization-1"],
          disconnectedAt: 0,
        }),
      );
      await redis.sadd("presence:offline:outbox", key);
    }

    await Effect.runPromise(store.sweepOffline());
    expect(events).toHaveLength(1);
    expect(await redis.smembers("presence:offline:outbox")).toHaveLength(2);
    expect(await redis.get("presence:offline:sweep-lock")).toBe("successor");
  });

  test("refresh cancels the previous deadline and a later exit gets a full grace period", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: unknown[] = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    const first = socket({ ...session([]), character });
    await Effect.runPromise(store.publish(first, { organizationIds: [] }));
    await Effect.runPromise(store.disconnect(first.data));
    now = 5_000;

    const second = socket({
      ...session([]),
      connectionId: "second",
      character,
    });

    await Effect.runPromise(store.publish(second, { organizationIds: [] }));
    now = 6_000;
    await Effect.runPromise(store.disconnect(second.data));
    now = 10_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toEqual([]);
    now = 16_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toHaveLength(1);
  });

  test("expired Redis presence still schedules departure from durable character metadata", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: Array<{ disconnectedAt: number }> = [];

    const makeStore = () =>
      new PresenceStore(
        { command: redis },
        new RecordingHub(),
        () => now,
        undefined,
        undefined,
        (event) =>
          Effect.sync(() => {
            events.push(event);
          }),
      );

    const game = socket({ ...session([]), character });
    await Effect.runPromise(makeStore().publish(game, { organizationIds: [] }));
    redis.values.delete("presence:organization-1:session-1");
    now = PRESENCE_EXPIRY_MS + 10_000;
    await Effect.runPromise(makeStore().sweepExpired());
    await Effect.runPromise(makeStore().sweepOffline());
    expect(events).toEqual([
      expect.objectContaining({ disconnectedAt: PRESENCE_EXPIRY_MS }),
    ]);
  });

  test("late expiry of an old session does not shorten the latest exit grace", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: unknown[] = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    const abandoned = socket({ ...session([]), character });
    await Effect.runPromise(store.publish(abandoned, { organizationIds: [] }));
    now = PRESENCE_EXPIRY_MS + 5_000;
    const fresh = socket({ ...session([]), connectionId: "fresh", character });
    await Effect.runPromise(store.publish(fresh, { organizationIds: [] }));
    now += 5_000;
    await Effect.runPromise(store.disconnect(fresh.data));
    now += 5_000;
    await Effect.runPromise(store.sweepExpired());
    await Effect.runPromise(store.sweepOffline());
    expect(events).toEqual([]);
    now += 5_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toHaveLength(1);
  });

  test("reconnect between the presence check and atomic departure decision cancels departure", async () => {
    let reconnect: (() => Promise<void>) | undefined;

    class ReconnectingRedis extends MemoryRedis {
      override async eval<A>(
        script: string,
        numberOfKeys: number,
        ...parameters: Array<string | number>
      ): Promise<A> {
        const operation = script.includes("-- presence:offline-claim")
          ? reconnect
          : undefined;

        if (operation) reconnect = undefined;
        await operation?.();

        return super.eval<A>(script, numberOfKeys, ...parameters);
      }
    }

    const redis = new ReconnectingRedis();
    let now = 0;
    const events: unknown[] = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    const game = socket({ ...session([]), character });
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    await Effect.runPromise(store.disconnect(game.data));
    now = 10_000;
    reconnect = async () => {
      await Effect.runPromise(
        store.publish(
          socket({ ...session([]), connectionId: "new", character }),
          { organizationIds: [] },
        ),
      );
    };

    await Effect.runPromise(store.sweepOffline());
    expect(events).toEqual([]);
  });

  test("failed publication remains durable after the departure decision", async () => {
    const redis = new MemoryRedis();
    let now = 0;

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      () => Effect.fail(new Error("Rabbit unavailable")),
    );

    const game = socket({ ...session([]), character });
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    await Effect.runPromise(store.disconnect(game.data));
    now = 10_000;
    await Effect.runPromise(store.sweepOffline().pipe(Effect.flip));
    const events: unknown[] = [];

    const recovered = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    await Effect.runPromise(recovered.sweepOffline());
    expect(events).toHaveLength(1);
  });

  test("changing game character expires the old character while the new one stays online", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: Array<{ characterId: string }> = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    const game = socket({ ...session([]), character });
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    game.data.character = { ...character, characterId: "other-character" };
    await Effect.runPromise(store.publish(game, { organizationIds: [] }));
    now = 10_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events.map((event) => event.characterId)).toEqual(["character-1"]);
  });

  test("another live game connection keeps the character online", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: unknown[] = [];

    const store = new PresenceStore(
      { command: redis },
      new RecordingHub(),
      () => now,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          events.push(event);
        }),
    );

    const first = socket({ ...session([]), character });

    const second = socket({
      ...session([]),
      connectionId: "second",
      character,
    });

    await Effect.runPromise(store.publish(first, { organizationIds: [] }));
    await Effect.runPromise(store.publish(second, { organizationIds: [] }));
    await Effect.runPromise(store.disconnect(first.data));
    now = 10_000;
    await Effect.runPromise(store.sweepOffline());
    expect(events).toEqual([]);
  });
});
