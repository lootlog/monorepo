import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { Effect, Metric, Schedule, Schema } from "effect";
import type { RedisGatewayCommands } from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";

const SNAPSHOTS = "realtime:metrics:instances:v1";
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
  attributes: { unit: "" },
});
const connections = Metric.gauge("lootlog_gateway_cluster_connections", {
  attributes: { unit: "" },
});
const gameSessions = Metric.gauge("lootlog_gateway_cluster_game_sessions", {
  attributes: { unit: "" },
});
const uniquePlayers = Metric.gauge("lootlog_gateway_cluster_unique_players", {
  attributes: { unit: "" },
});

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
      if (presence.character) {
        players.add(
          JSON.stringify([
            presence.character.world,
            presence.character.characterId,
          ]),
        );
      }
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
