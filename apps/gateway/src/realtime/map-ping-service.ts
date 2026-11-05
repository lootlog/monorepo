import {
  MapPingSendPayloadSchema,
  type MapPingAck,
  type MapPingEvent,
  type MapPingSendPayload,
} from "@lootlog/schema/map-ping";
import { Schema, Context, Effect, Layer } from "effect";
import {
  relayWithRateLimit,
  getPingScopes,
  getPingSender,
  type PingScriptStore,
} from "#src/realtime/ping-routing";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";
import { GatewayRedis } from "#src/platform/redis-store";
import type { CommandRoutes } from "#src/realtime/command-routes";

const RATE_LIMIT = 5;

const RATE_LIMIT_WINDOW_MS = 15_000;

const MAX_COORDINATE = 65_535;

const isMapPingSendPayload = Schema.is(MapPingSendPayloadSchema);

export class MapPingService {
  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  send(
    socket: GatewaySocket,
    payload: MapPingSendPayload,
  ): Effect.Effect<MapPingAck> {
    const { redis, hub } = this;

    if (!this.hasValidPayload(payload))
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });

    const context = getPingSender(socket, payload.expectedMapId);

    if (!context)
      return Effect.succeed({ status: "rejected", code: "invalid-context" });

    const scopes = getPingScopes(socket, context);

    if (scopes.length === 0)
      return Effect.succeed({ status: "rejected", code: "forbidden" });

    const pingId = crypto.randomUUID();

    return relayWithRateLimit({
      redis,
      context: "MapPingService",
      rateLimit: {
        key: `map-ping:rate:${socket.data.userId}`,
        windowMs: RATE_LIMIT_WINDOW_MS,
        limit: RATE_LIMIT,
        pingId,
      },
      publish: (createdAt) => {
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

        return hub.publishToScopes(
          scopes,
          { v: 1, type: "map-ping.received", data: event },
          {
            excludeConnectionId: socket.data.connectionId,
            recipientPlatform: "game",
            recipientWorld: context.world,
            recipientMapId: context.mapId,
          },
        );
      },
      failure: "Failed to route map ping",
      accepted: { status: "accepted", pingId } as const,
    });
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

/** Relays map pings to players of the same map. */
export class MapPings extends Context.Service<MapPings, MapPingService>()(
  "@lootlog/gateway/realtime/MapPings",
) {
  static readonly layer = Layer.effect(
    MapPings,
    Effect.gen(function* () {
      return new MapPingService(yield* GatewayRedis, yield* Hub);
    }),
  );
}

/** Map pings are relayed, never stored. */
export const mapPingRoutes = (pings: Pick<MapPingService, "send">) =>
  ({
    "map-ping.send": {
      joined: true,
      run: (socket, data) => pings.send(socket, data),
    },
  }) satisfies Pick<CommandRoutes, "map-ping.send">;
