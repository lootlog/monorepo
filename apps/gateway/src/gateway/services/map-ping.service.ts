import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import type {
  MapPingAck,
  MapPingEvent,
  MapPingSendPayload,
} from "@lootlog/types";
import type { Server } from "socket.io";
import { GatewayEvent } from "src/gateway/enums/gateway-event.enum";
import { Platform } from "src/gateway/enums/platform.enum";
import type { Socket } from "src/gateway/types/socket-user.type";
import {
  buildRoomName,
  canViewOnlinePlayers,
} from "src/gateway/utils/room-utils";

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

@Injectable()
export class MapPingService {
  private readonly logger = new Logger(MapPingService.name);

  constructor(private readonly redis: RedisService) {}

  async send(
    server: Server,
    client: Socket,
    payload: MapPingSendPayload,
  ): Promise<MapPingAck> {
    if (!this.hasValidCoordinates(payload)) {
      return { status: "rejected", code: "invalid-payload" };
    }

    const context = this.getSenderContext(client, payload);
    if (!context) {
      return { status: "rejected", code: "invalid-context" };
    }

    const eligibleGuildIds = client.data.guilds
      .filter((guildData) =>
        canViewOnlinePlayers(guildData, client.data.discordId),
      )
      .map(({ guild }) => guild.id);

    if (eligibleGuildIds.length === 0) {
      return { status: "rejected", code: "forbidden" };
    }

    const pingId = randomUUID();
    const rateLimitResult = await this.consumeRateLimit(
      client.data.userId,
      pingId,
    );
    if (!rateLimitResult) {
      return { status: "rejected", code: "temporarily-unavailable" };
    }

    const [accepted, createdAt, retryAfterMs] = rateLimitResult;
    if (accepted !== 1) {
      return {
        status: "rejected",
        code: "rate-limited",
        retryAfterMs,
      };
    }

    const event: MapPingEvent = {
      pingId,
      world: context.world,
      mapId: context.mapId,
      x: payload.x,
      y: payload.y,
      sender: {
        characterId: context.characterId,
        name: context.name,
      },
      createdAt,
    };

    const emitted = await this.emitToEligibleSockets(
      server,
      client,
      eligibleGuildIds,
      event,
    );
    if (!emitted) {
      return { status: "rejected", code: "temporarily-unavailable" };
    }

    return { status: "accepted", pingId };
  }

  private getSenderContext(client: Socket, payload: MapPingSendPayload) {
    const presence = client.data.playerPresence;
    if (
      client.data.platform !== Platform.GAME ||
      !client.data.guilds ||
      !client.data.userId ||
      !presence ||
      presence.mapId === undefined ||
      presence.mapId !== payload.expectedMapId ||
      !presence.world ||
      !presence.characterId ||
      !presence.name
    ) {
      return null;
    }

    return {
      world: presence.world,
      mapId: presence.mapId,
      characterId: presence.characterId,
      name: presence.name,
    };
  }

  private hasValidCoordinates({ x, y }: MapPingSendPayload) {
    return [x, y].every(
      (coordinate) =>
        Number.isInteger(coordinate) && coordinate >= 0 && coordinate <= 65_535,
    );
  }

  private async consumeRateLimit(userId: string, pingId: string) {
    try {
      const result = await this.redis.eval<RateLimitResult>(
        RATE_LIMIT_SCRIPT,
        [`map-ping:rate:${userId}`],
        [RATE_LIMIT_WINDOW_MS, RATE_LIMIT, pingId],
      );

      return result.map(Number) as RateLimitResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to apply map ping rate limit: ${message}`);
      return null;
    }
  }

  private async emitToEligibleSockets(
    server: Server,
    sourceClient: Socket,
    eligibleGuildIds: string[],
    event: MapPingEvent,
  ) {
    try {
      const rooms = eligibleGuildIds.map((guildId) =>
        buildRoomName(guildId, "online-players"),
      );
      const sockets = await server.in(rooms).fetchSockets();
      const emittedSocketIds = new Set<string>();
      const eligibleGuildIdSet = new Set(eligibleGuildIds);

      for (const socket of sockets) {
        if (
          socket.id === sourceClient.id ||
          emittedSocketIds.has(socket.id) ||
          socket.data.platform !== Platform.GAME ||
          socket.data.playerPresence?.world !== event.world ||
          socket.data.playerPresence?.mapId !== event.mapId ||
          !this.sharesEligibleGuild(socket, eligibleGuildIdSet)
        ) {
          continue;
        }

        emittedSocketIds.add(socket.id);
        socket.emit(GatewayEvent.MAP_PING_RECEIVE, event);
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to route map ping: ${message}`);
      return false;
    }
  }

  private sharesEligibleGuild(
    socket: Pick<Socket, "data">,
    eligibleGuildIds: ReadonlySet<string>,
  ) {
    return socket.data.guilds?.some(
      (guildData) =>
        eligibleGuildIds.has(guildData.guild.id) &&
        canViewOnlinePlayers(guildData, socket.data.discordId),
    );
  }
}
