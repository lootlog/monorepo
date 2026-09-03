import {
  isMapPingType,
  type MapPingAck,
  type MapPingEvent,
  type MapPingSendPayload,
} from "@lootlog/schema/map-ping";
import { Logger } from "#src/platform/logger";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";
import { canSubscribe } from "#src/realtime/subscription-policy";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15_000;
const RATE_LIMIT_SCRIPT = `
local time = redis.call("TIME")
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - window)
local count = redis.call("ZCARD", KEYS[1])
if count >= limit then
  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
  local retryAfter = math.max(1, tonumber(oldest[2]) + window - now)
  redis.call("PEXPIRE", KEYS[1], window)
  return {0, now, retryAfter}
end
redis.call("ZADD", KEYS[1], now, ARGV[3])
redis.call("PEXPIRE", KEYS[1], window)
return {1, now, 0}
`;

type RateLimitResult = [accepted: number, now: number, retryAfterMs: number];

export class MapPingService {
  private readonly logger = new Logger(MapPingService.name);

  constructor(
    private readonly redis: RedisGatewayStore,
    private readonly hub: RealtimeHub,
  ) {}

  async send(
    socket: GatewaySocket,
    payload: MapPingSendPayload,
  ): Promise<MapPingAck> {
    if (!this.hasValidPayload(payload)) {
      return { status: "rejected", code: "invalid-payload" };
    }
    const context = this.getContext(socket, payload.expectedMapId);
    if (!context) return { status: "rejected", code: "invalid-context" };

    const scopes = socket.data.guilds.flatMap(({ guild }) => {
      const scope = {
        topic: "map.pings" as const,
        organizationId: guild.id,
        world: context.world,
        mapId: context.mapId,
      };
      return canSubscribe(socket.data, scope) ? [scope] : [];
    });
    if (scopes.length === 0) return { status: "rejected", code: "forbidden" };

    const pingId = crypto.randomUUID();
    const rateLimit = await this.consumeRateLimit(socket.data.userId, pingId);
    if (!rateLimit)
      return { status: "rejected", code: "temporarily-unavailable" };
    const [accepted, createdAt, retryAfterMs] = rateLimit;
    if (accepted !== 1) {
      return { status: "rejected", code: "rate-limited", retryAfterMs };
    }

    const event: MapPingEvent = {
      pingId,
      world: context.world,
      mapId: context.mapId,
      type: payload.type,
      x: payload.x,
      y: payload.y,
      sender: { characterId: context.characterId, name: context.name },
      createdAt,
    };
    try {
      await this.hub.publishToScopes(
        scopes,
        { v: 1, type: "map-ping.received", data: event },
        {
          excludeConnectionId: socket.data.connectionId,
          recipientPlatform: "game",
          recipientWorld: context.world,
          recipientMapId: context.mapId,
        },
      );
    } catch (error) {
      this.logger.warn("Failed to route map ping", error);
      return { status: "rejected", code: "temporarily-unavailable" };
    }
    return { status: "accepted", pingId };
  }

  private getContext(socket: GatewaySocket, expectedMapId: number) {
    const presence = socket.data.presence;
    if (
      socket.data.platform !== "game" ||
      !presence?.character?.world ||
      !presence.character.characterId ||
      !presence.character.name ||
      presence.location?.mapId !== expectedMapId
    )
      return null;
    return {
      world: presence.character.world,
      mapId: expectedMapId,
      characterId: presence.character.characterId,
      name: presence.character.name,
    };
  }

  private hasValidPayload(payload: MapPingSendPayload): boolean {
    return (
      isMapPingType(payload.type) &&
      [payload.x, payload.y].every(
        (coordinate) =>
          Number.isInteger(coordinate) &&
          coordinate >= 0 &&
          coordinate <= 65_535,
      )
    );
  }

  private async consumeRateLimit(userId: string, pingId: string) {
    try {
      const result = await this.redis.command.eval(
        RATE_LIMIT_SCRIPT,
        1,
        `map-ping:rate:${userId}`,
        RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT,
        pingId,
      );
      if (!Array.isArray(result)) return null;
      return result.map(Number) as RateLimitResult;
    } catch (error) {
      this.logger.warn("Failed to apply map ping rate limit", error);
      return null;
    }
  }
}
