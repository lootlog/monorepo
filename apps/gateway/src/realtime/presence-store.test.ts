import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { PresenceStore } from "./presence-store.js";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

class MemoryRedis {
  readonly values = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();

  async set(
    key: string,
    value: string,
    ...options: string[]
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
  readonly instanceId = "instance-1";
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
  confidence: "reported",
  backpressureStrikes: 0,
});

const socket = (data: SessionData): GatewaySocket =>
  ({ data }) as GatewaySocket;

describe("PresenceStore", () => {
  test("uses server lastSeen and separates basic from precise location", async () => {
    const redis = new MemoryRedis();
    const hub = new RecordingHub();
    const store = new PresenceStore(
      { command: redis } as unknown as RedisGatewayStore,
      hub as unknown as RealtimeHub,
      () => 10_000,
    );
    const publisher = socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]));
    await store.publish(publisher, {
      organizationIds: ["organization-1", "unauthorized-organization"],
      isAfk: false,
      clientObservedAt: 1,
      location: { mapId: 42, map: "Kwieciste Przejście", x: 4, y: 7 },
    });

    const basic = await store.snapshot(
      session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      "organization-1",
    );
    const precise = await store.snapshot(
      session([
        Permission.LOOTLOG_ONLINE_PLAYERS_READ,
        Permission.LOOTLOG_PRESENCE_LOCATION_READ,
      ]),
      "organization-1",
    );
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
    await store.publish(
      socket(session([Permission.LOOTLOG_ONLINE_PLAYERS_READ])),
      { organizationIds: ["organization-1"] },
    );
    now = 61_001;
    await store.sweepExpired();
    const snapshot = await store.snapshot(
      session([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      "organization-1",
    );
    expect(snapshot.presences).toEqual([]);
    expect(snapshot.revision).toBe(2);
    expect(hub.events).toHaveLength(1);
  });
});
