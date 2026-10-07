import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import type { GlobalChatStats } from "@lootlog/schema/chat";
import { Effect, Metric, Schedule, Schema } from "effect";
import type {
  RedisGatewayCommands,
  RedisGatewayStore,
} from "#src/platform/redis-store";
import type { CommandIngress } from "#src/realtime/command-ingress";
import type { JoinAdmission } from "#src/realtime/join-admission";
import {
  FEDERATION_VERSION,
  globalChatScope,
  type RealtimeHub,
} from "#src/realtime/realtime-hub";

const SNAPSHOTS = "realtime:metrics:instances:v2";

const SAMPLE = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local snapshot = cjson.decode(ARGV[2])
snapshot.at = now
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(snapshot))
redis.call('EXPIRE', KEYS[1], 60)
local snapshots = redis.call('HGETALL', KEYS[1])
local connections, sessions, count = 0, 0, 0
local federationVersion = math.huge
local players = {}
local listeners = {}
local worldPlayers = {}
for i = 1, #snapshots, 2 do
  local value = cjson.decode(snapshots[i + 1])
  if now - value.at >= 30000 then
    redis.call('HDEL', KEYS[1], snapshots[i])
  else
    connections = connections + value.connections
    sessions = sessions + value.sessions
    -- Replicas that predate the field decode version 1 frames only.
    federationVersion = math.min(federationVersion, tonumber(value.federationVersion) or 1)
    for _, player in ipairs(value.players) do
      if not players[player] then players[player] = true; count = count + 1 end
    end
    -- Replicas that predate global chat stats send no listeners.
    for channel, listening in pairs(value.globalChatListeners or {}) do
      listeners[channel] = (listeners[channel] or 0) + listening
    end
    for world, playing in pairs(value.worldPlayers or {}) do
      worldPlayers[world] = (worldPlayers[world] or 0) + playing
    end
  end
end
return {connections, sessions, count, federationVersion, cjson.encode(listeners), cjson.encode(worldPlayers)}
`;

// Same liveness rule as SAMPLE, without writing this replica's snapshot.
const CLUSTER_FEDERATION_VERSION = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local version = nil
for _, raw in ipairs(redis.call('HVALS', KEYS[1])) do
  local value = cjson.decode(raw)
  if now - value.at < 30000 then
    local current = tonumber(value.federationVersion) or 1
    if version == nil or current < version then version = current end
  end
end
return version or 1
`;

/** Lowest `FEDERATION_VERSION` among the replicas that sampled in the last 30 s. */
export const readClusterFederationVersion = (
  redis: Pick<RedisGatewayCommands, "eval">,
) =>
  Effect.tryPromise(() =>
    redis.eval(CLUSTER_FEDERATION_VERSION, 1, SNAPSHOTS),
  ).pipe(Effect.map(Schema.decodeUnknownSync(Schema.Number)));

const decodeCounts = Schema.decodeUnknownSync(
  Schema.Tuple([
    Schema.Number,
    Schema.Number,
    Schema.Number,
    Schema.Number,
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Number)),
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Number)),
  ]),
);

/** Adds one User to the set under `key`. */
const addUser = (
  sets: Map<string, Set<string>>,
  key: string,
  discordId: string,
) => {
  const users = sets.get(key) ?? new Set<string>();

  users.add(discordId);
  sets.set(key, users);
};

/**
 * Unique Users per key on this replica. Replicas sum their counts, so a User
 * connected to two replicas counts twice.
 */
const countUsers = (sets: Map<string, Set<string>>) =>
  Object.fromEntries([...sets].map(([key, users]) => [key, users.size]));

/** The shared channel's key among global chat listener counts. */
const SHARED_CHANNEL = "";

/** Cluster-wide counts from one metrics sample. */
export type GlobalChatCounts = {
  online: number;
  playersByWorld: Record<string, number>;
  listeners: Record<string, number>;
};

/** The shared channel counts every world; a world's channel only its own. */
export const getGlobalChatStats = (
  counts: GlobalChatCounts,
  world: string | undefined,
): GlobalChatStats => {
  const listeners = counts.listeners[world ?? SHARED_CHANNEL] ?? 0;

  return world === undefined
    ? { online: counts.online, listeners }
    : { world, online: counts.playersByWorld[world] ?? 0, listeners };
};

const observedAt = Metric.gauge("lootlog_gateway_cluster_observed_at_seconds", {
  attributes: { unit: "s" },
});

const connections = Metric.gauge("lootlog_gateway_cluster_connections", {
  attributes: { unit: "" },
});

const gameSessions = Metric.gauge("lootlog_gateway_cluster_game_sessions", {
  attributes: { unit: "" },
});

const uniquePlayers = Metric.gauge("lootlog_gateway_cluster_unique_players", {
  description: "Unique Discord accounts with active game sessions",
  attributes: { unit: "" },
});

const runtimeGauges = {
  available: Metric.gauge("lootlog_gateway_available", {
    description:
      "1 while subscribed to realtime federation and not draining; readiness follows it",
  }),
  federationQueued: Metric.gauge("lootlog_gateway_federation_queued"),
  pendingCommands: Metric.gauge("lootlog_gateway_redis_pending"),
  pendingPublications: Metric.gauge("lootlog_gateway_publications_pending"),
  active: Metric.gauge("lootlog_gateway_commands_active"),
  cleanupActive: Metric.gauge("lootlog_gateway_cleanup_active"),
  retainedConnections: Metric.gauge("lootlog_gateway_connections_retained"),
  closingConnections: Metric.gauge("lootlog_gateway_connections_closing"),
  rejectedConnections: Metric.gauge(
    "lootlog_gateway_connections_rejected_total",
  ),
  pending: Metric.gauge("lootlog_gateway_commands_pending"),
  bytes: Metric.gauge("lootlog_gateway_commands_retained_bytes"),
  rejected: Metric.gauge("lootlog_gateway_commands_rejected_total"),
  maxConnectionPending: Metric.gauge("lootlog_gateway_commands_connection_max"),
  joinsActive: Metric.gauge("lootlog_gateway_joins_active"),
  joinsRejected: Metric.gauge("lootlog_gateway_joins_rejected_total"),
  bufferedBytes: Metric.gauge("lootlog_gateway_sockets_buffered_bytes"),
  maxBufferedBytes: Metric.gauge("lootlog_gateway_socket_buffered_bytes_max"),
};

// Fixed metric names, no user/Organization/connection labels or payload retention.
// Sample independently of Redis health so a stalled dependency remains visible.
export class GatewayRuntimeMetrics {
  constructor(
    private readonly redis: Pick<RedisGatewayStore, "getDiagnostics">,
    private readonly hub: Pick<
      RealtimeHub,
      "getLocalSockets" | "unavailableReason"
    >,
    private readonly ingress: Pick<CommandIngress, "getDiagnostics">,
    private readonly joins: Pick<JoinAdmission, "getDiagnostics">,
  ) {}

  readonly sample = Effect.fnUntraced(function* (this: GatewayRuntimeMetrics) {
    let bufferedBytes = 0;
    let maxBufferedBytes = 0;

    for (const socket of this.hub.getLocalSockets()) {
      const bytes = socket.getBufferedAmount();
      bufferedBytes += bytes;
      maxBufferedBytes = Math.max(maxBufferedBytes, bytes);
    }

    const values = {
      available: this.hub.unavailableReason() === undefined ? 1 : 0,
      ...this.redis.getDiagnostics(),
      ...this.ingress.getDiagnostics(),
      ...this.joins.getDiagnostics(),
      bufferedBytes,
      maxBufferedBytes,
    };

    for (const [key, value] of Object.entries(values)) {
      if (!(key in runtimeGauges)) continue;
      // SAFETY: the own keys above are the fixed diagnostic names in runtimeGauges.
      yield* Metric.update(
        runtimeGauges[key as keyof typeof runtimeGauges],
        value,
      );
    }
  });

  run() {
    return this.sample().pipe(Effect.repeat(Schedule.spaced("1 second")));
  }
}

export class GatewayMetrics {
  constructor(
    private readonly redis: Pick<RedisGatewayCommands, "eval">,
    private readonly hub: Pick<
      RealtimeHub,
      | "instanceId"
      | "getLocalSockets"
      | "clusterFederationVersion"
      | "globalChatCounts"
      | "publishToScopes"
    >,
    private readonly now: () => number = Date.now,
  ) {}

  readonly sample = Effect.fnUntraced(function* (this: GatewayMetrics) {
    const sockets = this.hub.getLocalSockets();
    const players = new Set<string>();
    const chatListeners = new Map<string, Set<string>>();
    const worldPlayers = new Map<string, Set<string>>();
    let sessions = 0;
    const now = this.now();

    for (const { data } of sockets) {
      for (const scope of data.subscriptions.values()) {
        if (
          scope.topic !== "global.chat" &&
          scope.topic !== "global.chat.world"
        )
          continue;
        addUser(chatListeners, scope.world ?? SHARED_CHANNEL, data.discordId);
      }

      const presence = data.presence;

      if (
        data.platform !== "game" ||
        !presence ||
        now - presence.lastSeen >= PRESENCE_EXPIRY_MS
      )
        continue;
      sessions += 1;
      players.add(data.discordId);

      if (presence.character)
        addUser(worldPlayers, presence.character.world, data.discordId);
    }

    // ponytail: one snapshot per replica is scanned every 10s; shard aggregation if replica/player counts make this Redis script costly.
    const counts = yield* Effect.tryPromise(() =>
      this.redis.eval(
        SAMPLE,
        1,
        SNAPSHOTS,
        this.hub.instanceId,
        JSON.stringify({
          connections: sockets.length,
          sessions,
          players: [...players],
          federationVersion: FEDERATION_VERSION,
          globalChatListeners: countUsers(chatListeners),
          worldPlayers: countUsers(worldPlayers),
        }),
      ),
    );

    const [
      connectionCount,
      sessionCount,
      playerCount,
      federationVersion,
      listeners,
      playersByWorld,
    ] = decodeCounts(counts);

    // Each replica samples every 10 s, so a starting older replica is seen within that.
    this.hub.clusterFederationVersion = federationVersion;
    const chatCounts = { online: playerCount, playersByWorld, listeners };
    // A new subscriber gets these at once instead of waiting for the next sample.
    this.hub.globalChatCounts = chatCounts;
    yield* Metric.update(connections, connectionCount);
    yield* Metric.update(gameSessions, sessionCount);
    yield* Metric.update(uniquePlayers, playerCount);
    yield* Metric.update(observedAt, this.now() / 1_000);

    // Every replica reads the same cluster totals, so each tells only its own
    // subscribers and nothing crosses federation.
    yield* Effect.forEach(
      chatListeners.keys(),
      (channel) => {
        const stats = getGlobalChatStats(
          chatCounts,
          channel === SHARED_CHANNEL ? undefined : channel,
        );

        return Effect.tryPromise(() =>
          this.hub.publishToScopes(
            [globalChatScope(stats.world)],
            { v: 1, type: "global-chat.stats", data: stats },
            { localOnly: true },
          ),
        );
      },
      { discard: true },
    );

    return {
      connections: connectionCount,
      gameSessions: sessionCount,
      uniquePlayers: playerCount,
    };
  });

  run() {
    return this.sample().pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("Gateway metrics sample failed", cause),
      ),
      Effect.repeat(Schedule.spaced("10 seconds")),
    );
  }
}
