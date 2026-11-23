import { Capability } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { PresenceStore } from "#src/realtime/presence-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import {
  makeSession,
  makeTestSocket,
  membership,
} from "./realtime-fixtures.js";

export class MemoryRedis {
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

export class RecordingHub {
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

export const READ = Capability.LOOTLOG_ONLINE_PLAYERS_READ;

export const LOCATION = Capability.LOOTLOG_PRESENCE_LOCATION_READ;

export const character = {
  name: "Player",
  characterId: "character-1",
  accountId: "account-1",
  world: "world-1",
  lvl: 100,
  prof: "w",
  icon: "player.gif",
};

export const session = (permissions: Capability[]): SessionData =>
  makeSession({
    connectionId: "session-1",
    platform: "game",
    guilds: [
      membership("organization-1", permissions, { ownerId: "someone-else" }),
    ],
  });

export const secondGuild = (permissions: Capability[]) =>
  membership("organization-2", permissions, {
    ownerId: "someone-else",
    roleId: "role-2",
  });

export const socket = (data: SessionData): GatewaySocket =>
  makeTestSocket(data).socket;

export const numberedSocket = (
  index: number,
  overrides: Partial<SessionData> = {},
) =>
  socket({
    ...session([READ]),
    connectionId: `session-${index}`,
    userId: `user-${index}`,
    discordId: `discord-${index}`,
    ...overrides,
  });

export const joinedOrganizations = (target: GatewaySocket) =>
  target.data.guilds.map(({ guild }) => guild.id);

export const makeStore = ({
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

export const publish = (
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

export const disconnect = (store: PresenceStore, target: GatewaySocket) =>
  Effect.runPromise(store.disconnect(target.data));

export const readSnapshot = (
  store: PresenceStore,
  viewer: SessionData = session([READ]),
  organizationId = "organization-1",
  world?: string,
) => Effect.runPromise(store.snapshot(viewer, organizationId, world));

export const flush = (store: PresenceStore) =>
  Effect.runPromise(store.flushDeltas);
