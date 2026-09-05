import { describe, expect, spyOn, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { PresenceStore } from "./presence-store.js";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import type { CoveragePublisher } from "#src/rabbit/coverage-publisher";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

class MemoryRedis {
  readonly values = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();

  async set(
    key: string,
    value: string,
    ...options: Array<string | number>
  ): Promise<string | null> {
    if (options.includes("NX") && this.values.has(key)) return null;
    this.values.set(key, value);
    return "OK";
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

class RecordingHub {
  readonly instanceId = "00000000-0000-4000-8000-000000000001";
  readonly presenceEvents: unknown[] = [];
  readonly events: unknown[] = [];

  async publishPresence(
    _scope: unknown,
    basic: unknown,
    precise: unknown,
  ): Promise<void> {
    this.presenceEvents.push({ basic, precise });
  }

  async publishToScope(_scope: unknown, event: unknown): Promise<void> {
    this.events.push(event);
  }

  async refreshRegistry(): Promise<void> {}
}

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
  backpressureStrikes: 0,
});

const socket = (data: SessionData): GatewaySocket =>
  ({ data }) as GatewaySocket;

const secondGuild = (permissions: Permission[]) => ({
  guild: { id: "organization-2", ownerId: "someone-else" },
  roles: [{ id: "role-2", lvlRangeFrom: 0, lvlRangeTo: 500, permissions }],
});

describe("PresenceStore", () => {
  test("batches map metadata while ignoring missing, malformed and other-map sessions", async () => {
    const redis = new MemoryRedis();
    const store = new PresenceStore(
      { command: redis } as unknown as RedisGatewayStore,
      new RecordingHub() as unknown as RealtimeHub,
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
    const store = new PresenceStore(
      { command: redis } as unknown as RedisGatewayStore,
      hub as unknown as RealtimeHub,
      () => 10_000,
    );
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
    expect(hub.presenceEvents).toHaveLength(1);
  });

  test("expires stale state and publishes a monotonic remove delta", async () => {
    let now = 1_000;
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore(
      { command: redis } as unknown as RedisGatewayStore,
      hub as unknown as RealtimeHub,
      () => now,
    );
    await Effect.runPromise(
      store.publish(socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ])), {
        organizationIds: ["organization-1"],
      }),
    );
    now = 61_001;
    await Effect.runPromise(store.sweepExpired());
    const snapshot = await Effect.runPromise(
      store.snapshot(
        session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
        "organization-1",
      ),
    );
    expect(snapshot.presences).toEqual([]);
    expect(snapshot.revision).toBe(2);
    expect(hub.events).toHaveLength(1);
    expect(hub.events[0]).toMatchObject({
      data: {
        changes: [
          { action: "remove", userId: "user-1", discordId: "discord-1" },
        ],
      },
    });
  });

  test("clears published presence and coverage when all organization access is revoked", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const coverage = new RecordingCoverage();
    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    const store = new PresenceStore(
      { command: redis } as unknown as RedisGatewayStore,
      hub as unknown as RealtimeHub,
      () => 10_000,
      coverage as unknown as CoveragePublisher,
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
        coverage as unknown as CoveragePublisher,
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
      expect(hub.presenceEvents).toHaveLength(2);
      expect(
        await Effect.runPromise(
          store.snapshot(publisher.data, "unauthorized-organization"),
        ),
      ).toMatchObject({ presences: [] });
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
      { command: redis } as unknown as RedisGatewayStore,
      hub as unknown as RealtimeHub,
      () => 10_000,
      coverage as unknown as CoveragePublisher,
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
    const store = new PresenceStore(
      { command: redis } as unknown as RedisGatewayStore,
      hub as unknown as RealtimeHub,
      () => now,
    );
    await Effect.runPromise(
      store.publish(publisher, { organizationIds: ["organization-1"] }),
    );
    hub.presenceEvents.length = 0;

    now = 20_000;
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));

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
    override async smembers(key: string) {
      attempts++;
      if (attempts === 1) throw new Error("Redis temporarily unavailable");
      return super.smembers(key);
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
