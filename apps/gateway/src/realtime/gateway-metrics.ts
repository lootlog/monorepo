import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { Effect, Metric, Schedule, Schema } from "effect";
import type {
  RedisGatewayCommands,
  RedisGatewayStore,
} from "#src/platform/redis-store";
import type { CommandIngress } from "#src/realtime/command-ingress";
import type { RealtimeHub } from "#src/realtime/realtime-hub";

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
  end
end
return {connections, sessions, count}
`;

const decodeCounts = Schema.decodeUnknownSync(
  Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]),
);

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
  federationQueued: Metric.gauge("lootlog_gateway_federation_queued"),
  pendingCommands: Metric.gauge("lootlog_gateway_redis_pending"),
  pendingPublications: Metric.gauge("lootlog_gateway_publications_pending"),
  active: Metric.gauge("lootlog_gateway_commands_active"),
  pending: Metric.gauge("lootlog_gateway_commands_pending"),
  bytes: Metric.gauge("lootlog_gateway_commands_retained_bytes"),
  rejected: Metric.gauge("lootlog_gateway_commands_rejected_total"),
  maxConnectionPending: Metric.gauge("lootlog_gateway_commands_connection_max"),
  bufferedBytes: Metric.gauge("lootlog_gateway_sockets_buffered_bytes"),
  maxBufferedBytes: Metric.gauge("lootlog_gateway_socket_buffered_bytes_max"),
};

// Fixed metric names, no user/Organization/connection labels or payload retention.
// Sample independently of Redis health so a stalled dependency remains visible.
export class GatewayRuntimeMetrics {
  constructor(
    private readonly redis: Pick<RedisGatewayStore, "getDiagnostics">,
    private readonly hub: Pick<RealtimeHub, "getLocalSockets">,
    private readonly ingress: Pick<CommandIngress, "getDiagnostics">,
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
      ...this.redis.getDiagnostics(),
      ...this.ingress.getDiagnostics(),
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
    private readonly hub: Pick<RealtimeHub, "instanceId" | "getLocalSockets">,
    private readonly now: () => number = Date.now,
  ) {}

  readonly sample = Effect.fnUntraced(function* (this: GatewayMetrics) {
    const sockets = this.hub.getLocalSockets();
    const players = new Set<string>();
    let sessions = 0;
    const now = this.now();

    for (const { data } of sockets) {
      const presence = data.presence;

      if (
        data.platform !== "game" ||
        !presence ||
        now - presence.lastSeen >= PRESENCE_EXPIRY_MS
      )
        continue;
      sessions += 1;
      players.add(data.discordId);
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
        }),
      ),
    );

    const [connectionCount, sessionCount, playerCount] = decodeCounts(counts);
    yield* Metric.update(connections, connectionCount);
    yield* Metric.update(gameSessions, sessionCount);
    yield* Metric.update(uniquePlayers, playerCount);
    yield* Metric.update(observedAt, this.now() / 1_000);

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
