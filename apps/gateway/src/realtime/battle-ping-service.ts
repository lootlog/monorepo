import {
  BattlePingSendPayloadSchema,
  type BattlePingEvent,
  type BattlePingSendPayload,
} from "@lootlog/schema/battle-ping";
import type { MapPingAck } from "@lootlog/schema/map-ping";
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

const RATE_LIMIT = 8;

const RATE_LIMIT_WINDOW_MS = 10_000;

const isBattlePingSendPayload = Schema.is(BattlePingSendPayloadSchema);

export class BattlePingService {
  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  send(
    socket: GatewaySocket,
    payload: BattlePingSendPayload,
  ): Effect.Effect<MapPingAck> {
    const { redis, hub } = this;

    if (!isBattlePingSendPayload(payload))
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });

    const sender = getPingSender(socket, payload.expectedMapId);

    if (!sender)
      return Effect.succeed({ status: "rejected", code: "invalid-context" });

    const recipientCharacterIds = payload.recipientCharacterIds.filter(
      (characterId) => characterId !== sender.characterId,
    );

    if (recipientCharacterIds.length === 0)
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });

    const scopes = getPingScopes(socket, sender);

    if (scopes.length === 0)
      return Effect.succeed({ status: "rejected", code: "forbidden" });

    const pingId = crypto.randomUUID();

    return relayWithRateLimit({
      redis,
      context: "BattlePingService",
      rateLimit: {
        key: `battle-ping:rate:${socket.data.userId}`,
        windowMs: RATE_LIMIT_WINDOW_MS,
        limit: RATE_LIMIT,
        pingId,
      },
      publish: (createdAt) => {
        const event: BattlePingEvent = {
          pingId,
          world: sender.world,
          mapId: sender.mapId,
          type: payload.type,
          warriorId: payload.warriorId,
          sender: { characterId: sender.characterId, name: sender.name },
          createdAt,
        };

        return hub.publishToScopes(
          scopes,
          { v: 1, type: "battle-ping.received", data: event },
          {
            excludeConnectionId: socket.data.connectionId,
            recipientPlatform: "game",
            recipientWorld: sender.world,
            recipientMapId: sender.mapId,
            recipientCharacterIds,
          },
        );
      },
      failure: "Failed to route battle ping",
      accepted: { status: "accepted", pingId } as const,
    });
  }
}

/** Relays battle pings to the listed teammates. */
export class BattlePings extends Context.Service<
  BattlePings,
  BattlePingService
>()("@lootlog/gateway/realtime/BattlePings") {
  static readonly layer = Layer.effect(
    BattlePings,
    Effect.gen(function* () {
      return new BattlePingService(yield* GatewayRedis, yield* Hub);
    }),
  );
}

/** Battle pings are relayed to teammates, never stored. */
export const battlePingRoutes = (pings: Pick<BattlePingService, "send">) =>
  ({
    "battle-ping.send": {
      joined: true,
      run: (socket, data) => pings.send(socket, data),
    },
  }) satisfies Pick<CommandRoutes, "battle-ping.send">;
