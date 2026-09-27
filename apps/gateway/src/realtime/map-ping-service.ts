import {
  MapPingSendPayloadSchema,
  type MapPingAck,
  type MapPingEvent,
  type MapPingSendPayload,
} from "@lootlog/schema/map-ping";
import { Schema } from "effect";
import { Logger } from "#src/platform/logger";
import {
  consumePingRateLimit,
  getPingScopes,
  getPingSender,
  type PingScriptStore,
} from "#src/realtime/ping-routing";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";

const RATE_LIMIT = 5;

const RATE_LIMIT_WINDOW_MS = 15_000;

const MAX_COORDINATE = 65_535;

const isMapPingSendPayload = Schema.is(MapPingSendPayloadSchema);

export class MapPingService {
  private readonly logger = new Logger(MapPingService.name);

  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  async send(
    socket: GatewaySocket,
    payload: MapPingSendPayload,
  ): Promise<MapPingAck> {
    if (!this.hasValidPayload(payload)) {
      return { status: "rejected", code: "invalid-payload" };
    }

    const context = getPingSender(socket, payload.expectedMapId);

    if (!context) return { status: "rejected", code: "invalid-context" };

    const scopes = getPingScopes(socket, context);

    if (scopes.length === 0) return { status: "rejected", code: "forbidden" };

    const pingId = crypto.randomUUID();

    const rateLimit = await consumePingRateLimit(this.redis, this.logger, {
      key: `map-ping:rate:${socket.data.userId}`,
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: RATE_LIMIT,
      pingId,
    });

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
      ...(payload.npcId !== undefined && { npcId: payload.npcId }),
      ...(payload.playerId !== undefined && { playerId: payload.playerId }),
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

  private hasValidPayload(payload: MapPingSendPayload): boolean {
    return (
      isMapPingSendPayload(payload) &&
      // A ping targets one character at most.
      (payload.npcId === undefined || payload.playerId === undefined) &&
      payload.x <= MAX_COORDINATE &&
      payload.y <= MAX_COORDINATE
    );
  }
}
