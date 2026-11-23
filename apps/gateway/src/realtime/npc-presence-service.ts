import {
  NPC_PRESENCE_MIN_WT,
  NPC_PRESENCE_TTL_MS,
  NpcPresenceNpcSchema,
  NpcPresenceSnapshotSchema,
  type NpcPresenceNpc,
  type NpcPresenceReport,
  type NpcPresenceReportAck,
  type NpcPresenceSnapshot,
} from "@lootlog/schema/npc-presence";
import { Capability } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Schema, Context, Effect, Exit, Layer, Semaphore } from "effect";
import {
  consumePingRateLimit,
  type PingScriptStore,
} from "#src/realtime/ping-routing";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, NpcPresenceState } from "#src/realtime/session";
import { canReadSourceEvent } from "#src/realtime/source-event-visibility";
import { canSubscribe, hasPermission } from "#src/realtime/subscription-policy";
import { GatewayRedis } from "#src/platform/redis-store";
import {
  orAccessDenied,
  type CommandRoutes,
} from "#src/realtime/command-routes";
import { RealtimeStoreError, storeCall } from "#src/realtime/realtime-errors";

const RATE_LIMIT = 30;

const RATE_LIMIT_WINDOW_MS = 10_000;

const REVISION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

const LUA_COMMON = `
local function nowMs()
  local time = redis.call("TIME")
  return (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end
local function npcId(field) return string.match(field, "^([^|]+)|") end
`;

const APPLY_SCRIPT = `${LUA_COMMON}
local now = nowMs()
local connection = ARGV[1]
local ttl = tonumber(ARGV[2])
local suffix = "|" .. connection
local map = ARGV[5]
if map == "" then map = nil end
local reported = {}
for _, npc in ipairs(cjson.decode(ARGV[3])) do reported[tostring(npc.id)] = npc end
local function standing()
  local records = {}
  local raw = redis.call("HGETALL", KEYS[1])
  for i = 1, #raw, 2 do
    local id = npcId(raw[i])
    if records[id] == nil then records[id] = cjson.decode(raw[i + 1]) end
  end
  return records
end
local before = standing()
for _, field in ipairs(redis.call("ZRANGEBYSCORE", KEYS[2], "-inf", now)) do
  redis.call("HDEL", KEYS[1], field)
  redis.call("ZREM", KEYS[2], field)
end
for _, field in ipairs(redis.call("HKEYS", KEYS[1])) do
  if string.sub(field, -#suffix) == suffix and reported[npcId(field)] == nil then
    redis.call("HDEL", KEYS[1], field)
    redis.call("ZREM", KEYS[2], field)
  end
end
for id, npc in pairs(reported) do
  local field = id .. suffix
  redis.call("HSETNX", KEYS[1], field, cjson.encode({ npc = npc, since = now, map = map }))
  redis.call("ZADD", KEYS[2], now + ttl, field)
end
local after = standing()
local changes = {}
for id, record in pairs(before) do
  if after[id] == nil then
    table.insert(changes, { npc = record.npc, standing = false, since = record.since, map = record.map, revision = redis.call("INCR", KEYS[3]) })
  end
end
for id, record in pairs(after) do
  if before[id] == nil then
    table.insert(changes, { npc = record.npc, standing = true, since = record.since, map = record.map, revision = redis.call("INCR", KEYS[3]) })
  end
end
if redis.call("HLEN", KEYS[1]) > 0 then
  redis.call("PEXPIRE", KEYS[1], ttl * 2)
  redis.call("PEXPIRE", KEYS[2], ttl * 2)
end
if #changes == 0 then return "[]" end
redis.call("PEXPIRE", KEYS[3], ARGV[4])
return cjson.encode(changes)
`;

const SNAPSHOT_SCRIPT = `${LUA_COMMON}
local now = nowMs()
local earliest = {}
local raw = redis.call("HGETALL", KEYS[1])
for i = 1, #raw, 2 do
  local expiresAt = redis.call("ZSCORE", KEYS[2], raw[i])
  if expiresAt and tonumber(expiresAt) > now then
    local id = npcId(raw[i])
    local record = cjson.decode(raw[i + 1])
    if earliest[id] == nil or record.since < earliest[id].since then earliest[id] = record end
  end
end
local npcs = {}
for _, record in pairs(earliest) do table.insert(npcs, record) end
local revision = tonumber(redis.call("GET", KEYS[3]) or "0")
if #npcs == 0 then return '{"revision":' .. revision .. ',"npcs":[]}' end
return cjson.encode({ revision = revision, npcs = npcs })
`;

const ChangesJson = Schema.fromJsonString(
  Schema.Array(
    Schema.Struct({
      npc: NpcPresenceNpcSchema,
      standing: Schema.Boolean,
      since: Schema.Finite,
      map: Schema.optionalKey(Schema.String),
      revision: Schema.Finite,
    }),
  ),
);

const decodeChanges = Schema.decodeUnknownSync(ChangesJson);

const decodeSnapshot = Schema.decodeUnknownSync(
  Schema.fromJsonString(NpcPresenceSnapshotSchema),
);

type Event = ServerEvent;

type Operation = {
  organizationId: string;
  world: string;
  npcs: NpcPresenceNpc[];
  map: string | undefined;
};

const keys = (organizationId: string, world: string) => {
  const tag = `{npc-presence:v1:${organizationId}:${world}}`;

  return [`${tag}:reports`, `${tag}:expiry`, `${tag}:revision`] as const;
};

const presenceEvent = (
  organizationId: string,
  world: string,
  change: {
    npc: NpcPresenceNpc;
    standing: boolean;
    since: number;
    map?: string;
    revision: number;
  },
): Event => ({
  v: 1,
  type: "npc-presence.updated",
  data: { organizationId, world, ...change },
});

const operation = (
  organizationId: string,
  state: NpcPresenceState,
  npcs: readonly NpcPresenceNpc[] = [...state.npcs.values()],
): Operation => ({
  organizationId,
  world: state.world,
  npcs: [...npcs],
  map: state.map,
});

const sameNpcs = (
  first: ReadonlyMap<number, NpcPresenceNpc>,
  second: ReadonlyMap<number, NpcPresenceNpc>,
) =>
  first.size === second.size && [...first.keys()].every((id) => second.has(id));

const planOperations = (
  previous: NpcPresenceState | undefined,
  next: NpcPresenceState | undefined,
): Operation[] => {
  const sameScope =
    previous?.world === next?.world &&
    previous?.characterId === next?.characterId;

  const kept = (organizationId: string) =>
    sameScope && Boolean(next?.organizationIds.includes(organizationId));

  const withdrawals = previous
    ? previous.organizationIds
        .filter((organizationId) => !kept(organizationId))
        .map((organizationId) => operation(organizationId, previous, []))
    : [];

  if (!next) return withdrawals;

  const unchanged = (organizationId: string) =>
    Boolean(
      sameScope &&
      previous?.organizationIds.includes(organizationId) &&
      sameNpcs(previous.npcs, next.npcs),
    );

  return [
    ...withdrawals,
    ...next.organizationIds
      .filter((organizationId) => !unchanged(organizationId))
      .map((organizationId) => operation(organizationId, next)),
  ];
};

export class NpcPresenceService {
  private readonly locks = new WeakMap<GatewaySocket, Semaphore.Semaphore>();

  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  report(
    socket: GatewaySocket,
    payload: NpcPresenceReport,
  ): Effect.Effect<NpcPresenceReportAck> {
    return this.serialize(socket, this.performReport(socket, payload));
  }

  refresh(socket: GatewaySocket): Effect.Effect<void> {
    if (!socket.data.npcPresence) return Effect.void;

    return this.serialize(
      socket,
      Effect.suspend(() => {
        const state = socket.data.npcPresence;

        if (!state) return Effect.void;

        const allowed = this.reportableOrganizations(
          socket,
          state.organizationIds,
        );

        return this.apply(
          socket,
          state.organizationIds.map((organizationId) =>
            allowed.includes(organizationId)
              ? operation(organizationId, state)
              : operation(organizationId, state, []),
          ),
        ).pipe(
          Effect.catch((error) =>
            Effect.logWarning("Failed to refresh NPC presence", error),
          ),
          Effect.ensuring(
            Effect.sync(() => {
              socket.data.npcPresence =
                allowed.length > 0
                  ? { ...state, organizationIds: allowed }
                  : undefined;
            }),
          ),
        );
      }),
    );
  }

  withdraw(socket: GatewaySocket): Effect.Effect<void, RealtimeStoreError> {
    if (!socket.data.npcPresence) return Effect.void;

    return this.serialize(
      socket,
      Effect.suspend(() => {
        const state = socket.data.npcPresence;

        if (!state) return Effect.void;
        socket.data.npcPresence = undefined;

        return this.apply(
          socket,
          state.organizationIds.map((organizationId) =>
            operation(organizationId, state, []),
          ),
        );
      }),
    );
  }

  fetch(
    socket: GatewaySocket,
    organizationId: string,
    world: string,
  ): Effect.Effect<NpcPresenceSnapshot | null, RealtimeStoreError> {
    if (
      !canSubscribe(socket.data, {
        topic: "organization.timers",
        organizationId,
      }) ||
      !hasPermission(
        socket.data,
        organizationId,
        Capability.LOOTLOG_TIMERS_READ,
      )
    )
      return Effect.succeed(null);

    return storeCall("npc-presence.snapshot", async () =>
      decodeSnapshot(
        String(
          await this.redis.command.eval(
            SNAPSHOT_SCRIPT,
            3,
            ...keys(organizationId, world),
          ),
        ),
      ),
    ).pipe(
      Effect.map((snapshot) => ({
        revision: snapshot.revision,
        npcs: snapshot.npcs.filter(({ npc, since }) =>
          canReadSourceEvent(
            socket.data,
            presenceEvent(organizationId, world, {
              npc,
              since,
              standing: true,
              revision: snapshot.revision,
            }),
          ),
        ),
      })),
    );
  }

  private performReport(
    socket: GatewaySocket,
    payload: NpcPresenceReport,
  ): Effect.Effect<NpcPresenceReportAck> {
    const { redis } = this;
    const apply = this.apply.bind(this);
    const reportableOrganizations = this.reportableOrganizations.bind(this);

    return Effect.gen(function* () {
      const character = socket.data.character;

      if (
        socket.data.platform !== "game" ||
        !character ||
        character.world !== payload.world
      )
        return { status: "rejected", code: "invalid-context" } as const;

      const rateLimit = yield* consumePingRateLimit(
        redis,
        "NpcPresenceService",
        {
          key: `npc-presence:rate:${socket.data.connectionId}`,
          windowMs: RATE_LIMIT_WINDOW_MS,
          limit: RATE_LIMIT,
          pingId: crypto.randomUUID(),
        },
      );

      if (!rateLimit)
        return { status: "rejected", code: "temporarily-unavailable" } as const;
      const [accepted, , retryAfterMs] = rateLimit;

      if (accepted !== 1)
        return {
          status: "rejected",
          code: "rate-limited",
          retryAfterMs,
        } as const;

      const previous = socket.data.npcPresence;

      const npcs = new Map(
        payload.npcs
          .filter((npc) => npc.wt >= NPC_PRESENCE_MIN_WT)
          .map((npc) => [npc.id, npc]),
      );

      const organizationIds = reportableOrganizations(socket, [
        ...new Set(payload.organizationIds),
      ]);

      const next: NpcPresenceState | undefined =
        npcs.size > 0 && organizationIds.length > 0
          ? {
              world: payload.world,
              characterId: character.characterId,
              organizationIds,
              npcs,
              map: payload.map,
            }
          : undefined;

      const operations = previous
        ? planOperations(previous, next)
        : organizationIds.map((organizationId) => ({
            organizationId,
            world: payload.world,
            npcs: [...npcs.values()],
            map: payload.map,
          }));

      socket.data.npcPresence = undefined;

      return yield* apply(socket, operations).pipe(
        Effect.map(() => {
          socket.data.npcPresence = next;

          return { status: "accepted" } as const;
        }),
        Effect.catch((error) =>
          Effect.logWarning("Failed to store NPC presence", error).pipe(
            Effect.as({
              status: "rejected",
              code: "temporarily-unavailable",
            } as const),
          ),
        ),
      );
    }).pipe(Effect.annotateLogs({ context: "NpcPresenceService" }));
  }

  private reportableOrganizations(
    socket: GatewaySocket,
    organizationIds: readonly string[],
  ): string[] {
    if (socket.data.apiKeyAccess) return [];

    return organizationIds.filter((organizationId) =>
      hasPermission(
        socket.data,
        organizationId,
        Capability.LOOTLOG_TIMERS_WRITE,
      ),
    );
  }

  private apply(
    socket: GatewaySocket,
    operations: readonly Operation[],
  ): Effect.Effect<void, RealtimeStoreError> {
    const { redis, hub } = this;

    return Effect.forEach(
      operations,
      ({ organizationId, world, npcs, map }) =>
        storeCall("npc-presence.apply", async () =>
          decodeChanges(
            String(
              await redis.command.eval(
                APPLY_SCRIPT,
                3,
                ...keys(organizationId, world),
                socket.data.connectionId,
                NPC_PRESENCE_TTL_MS,
                JSON.stringify(npcs),
                REVISION_TTL_MS,
                map ?? "",
              ),
            ),
          ),
        ).pipe(
          Effect.flatMap((changes) =>
            Effect.forEach(
              changes,
              (change) =>
                Effect.tryPromise(() =>
                  hub.publishToScopes(
                    [{ topic: "organization.timers", organizationId }],
                    presenceEvent(organizationId, world, change),
                    { recipientPlatform: "game" },
                  ),
                ).pipe(
                  Effect.catch((error) =>
                    Effect.logWarning("Failed to publish NPC presence", error),
                  ),
                ),
              { discard: true },
            ),
          ),
          Effect.exit,
        ),
      { concurrency: "unbounded" },
    ).pipe(
      Effect.flatMap((exits) => {
        const failed = exits.find(Exit.isFailure);

        return failed ? failed : Effect.void;
      }),
    );
  }

  private serialize<A, E>(
    socket: GatewaySocket,
    effect: Effect.Effect<A, E>,
  ): Effect.Effect<A, E> {
    let lock = this.locks.get(socket);

    if (!lock) {
      lock = Semaphore.makeUnsafe(1);
      this.locks.set(socket, lock);
    }

    return lock.withPermits(1)(effect);
  }
}

export class NpcPresence extends Context.Service<
  NpcPresence,
  NpcPresenceService
>()("@lootlog/gateway/realtime/NpcPresence") {
  static readonly layer = Layer.effect(
    NpcPresence,
    Effect.gen(function* () {
      return new NpcPresenceService(yield* GatewayRedis, yield* Hub);
    }),
  );
}

export const npcPresenceRoutes = (
  npcPresence: Pick<NpcPresenceService, "report" | "fetch">,
) =>
  ({
    "npc-presence.report": {
      joined: true,
      run: (socket, data) => npcPresence.report(socket, data),
    },
    "npc-presence.fetch": {
      joined: true,
      run: (socket, { organizationId, world }) =>
        orAccessDenied(npcPresence.fetch(socket, organizationId, world)),
    },
  }) satisfies Pick<
    CommandRoutes,
    "npc-presence.report" | "npc-presence.fetch"
  >;
