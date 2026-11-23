import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import type { GlobalChatStats } from "@lootlog/schema/chat";
import { Effect, Layer, Metric, Schedule, Schema } from "effect";
import {
  GatewayRedis,
  type RedisGatewayCommands,
  type RedisGatewayStore,
} from "#src/platform/redis-store";
import { Ingress, type CommandIngress } from "#src/realtime/command-ingress";
import {
  CommandAdmissions,
  type CommandAdmission,
} from "#src/realtime/command-admission";
import { Hub, type RealtimeHub } from "#src/realtime/realtime-hub";
import {
  globalChatScope,
  isGlobalChatTopic,
} from "#src/realtime/global-chat-scope";

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
local players = {}
local listeners, listenerIds = {}, {}
local worldPlayers, worldPlayerIds = {}, {}
local function addUsers(counts, seen, key, users)
  seen[key] = seen[key] or {}
  for _, user in ipairs(users) do
    if not seen[key][user] then
      seen[key][user] = true
      counts[key] = (counts[key] or 0) + 1
    end
  end
end
local function addAll(counts, seen, ids, legacy)
  if ids then
    for key, users in pairs(ids) do addUsers(counts, seen, key, users) end
  else
    for key, users in pairs(legacy) do counts[key] = (counts[key] or 0) + users end
  end
end
for i = 1, #snapshots, 2 do
  local value = cjson.decode(snapshots[i + 1])
  if now - value.at >= 30000 then
    redis.call('HDEL', KEYS[1], snapshots[i])
  else
    connections = connections + value.connections
    sessions = sessions + value.sessions
    for _, player in ipairs(value.players) do
      if not players[player] then players[player] = true; count = count + 1 end
    end
    addAll(listeners, listenerIds, value.globalChatListenerIds, value.globalChatListeners)
    addAll(worldPlayers, worldPlayerIds, value.worldPlayerIds, value.worldPlayers)
  end
end
return {connections, sessions, count, cjson.encode(listeners), cjson.encode(worldPlayers)}
`;

const decodeCounts = Schema.decodeUnknownSync(
  Schema.Tuple([
    Schema.Finite,
    Schema.Finite,
    Schema.Finite,
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Finite)),
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Finite)),
  ]),
);

const addUser = (
  sets: Map<string, Set<string>>,
  key: string,
  userId: string,
) => {
  const users = sets.get(key) ?? new Set<string>();

  users.add(userId);
  sets.set(key, users);
};

const countUsers = (sets: Map<string, Set<string>>) =>
  Object.fromEntries([...sets].map(([key, users]) => [key, users.size]));

const listUsers = (sets: Map<string, Set<string>>) =>
  Object.fromEntries([...sets].map(([key, users]) => [key, [...users]]));

const SHARED_CHANNEL = "";

export type GlobalChatCounts = {
  online: number;
  playersByWorld: Record<string, number>;
  listeners: Record<string, number>;
};

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

const sampleDuration = Metric.gauge("lootlog_gateway_cluster_sample_seconds", {
  description:
    "Duration of the cluster metrics Redis script including its round trip; it grows with replicas and players",
  attributes: { unit: "s" },
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
  airTagObservationsActive: Metric.gauge(
    "lootlog_gateway_air_tag_observations_active",
  ),
  airTagObservationsRejected: Metric.gauge(
    "lootlog_gateway_air_tag_observations_rejected_total",
  ),
  bufferedBytes: Metric.gauge("lootlog_gateway_sockets_buffered_bytes"),
  maxBufferedBytes: Metric.gauge("lootlog_gateway_socket_buffered_bytes_max"),
};

export class GatewayRuntimeMetrics {
  static readonly layer = Layer.effectDiscard(
    Effect.gen(function* () {
      const admissions = yield* CommandAdmissions;

      yield* new GatewayRuntimeMetrics(
        yield* GatewayRedis,
        yield* Hub,
        yield* Ingress,
        admissions.joins,
        admissions.airTagObservations,
      )
        .run()
        .pipe(Effect.forkScoped);
    }),
  );

  constructor(
    private readonly redis: Pick<RedisGatewayStore, "getDiagnostics">,
    private readonly hub: Pick<
      RealtimeHub,
      "getLocalSockets" | "unavailableReason"
    >,
    private readonly ingress: Pick<CommandIngress, "getDiagnostics">,
    private readonly joins: Pick<CommandAdmission, "getDiagnostics">,
    private readonly airTagObservations: Pick<
      CommandAdmission,
      "getDiagnostics"
    >,
  ) {}

  readonly sample = Effect.fnUntraced(function* (this: GatewayRuntimeMetrics) {
    let bufferedBytes = 0;
    let maxBufferedBytes = 0;

    for (const socket of this.hub.getLocalSockets()) {
      const bytes = socket.getBufferedAmount();
      bufferedBytes += bytes;
      maxBufferedBytes = Math.max(maxBufferedBytes, bytes);
    }

    const joins = this.joins.getDiagnostics();
    const airTagObservations = this.airTagObservations.getDiagnostics();

    const values = {
      available: this.hub.unavailableReason() === undefined ? 1 : 0,
      ...this.redis.getDiagnostics(),
      ...this.ingress.getDiagnostics(),
      joinsActive: joins.active,
      joinsRejected: joins.rejected,
      airTagObservationsActive: airTagObservations.active,
      airTagObservationsRejected: airTagObservations.rejected,
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
  static readonly layer = Layer.effectDiscard(
    Effect.gen(function* () {
      yield* new GatewayMetrics((yield* GatewayRedis).command, yield* Hub)
        .run()
        .pipe(Effect.forkScoped);
    }),
  );

  constructor(
    private readonly redis: Pick<RedisGatewayCommands, "eval">,
    private readonly hub: Pick<
      RealtimeHub,
      "instanceId" | "getLocalSockets" | "globalChatCounts" | "publishToScopes"
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
        if (!isGlobalChatTopic(scope.topic)) continue;
        addUser(chatListeners, scope.world ?? SHARED_CHANNEL, data.userId);
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
        addUser(worldPlayers, presence.character.world, data.userId);
    }

    const sampleStartedAt = performance.now();

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
          globalChatListeners: countUsers(chatListeners),
          globalChatListenerIds: listUsers(chatListeners),
          worldPlayers: countUsers(worldPlayers),
          worldPlayerIds: listUsers(worldPlayers),
        }),
      ),
    );

    yield* Metric.update(
      sampleDuration,
      (performance.now() - sampleStartedAt) / 1_000,
    );

    const [
      connectionCount,
      sessionCount,
      playerCount,
      listeners,
      playersByWorld,
    ] = decodeCounts(counts);

    const chatCounts = { online: playerCount, playersByWorld, listeners };
    this.hub.globalChatCounts = chatCounts;
    yield* Metric.update(connections, connectionCount);
    yield* Metric.update(gameSessions, sessionCount);
    yield* Metric.update(uniquePlayers, playerCount);
    yield* Metric.update(observedAt, this.now() / 1_000);

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
