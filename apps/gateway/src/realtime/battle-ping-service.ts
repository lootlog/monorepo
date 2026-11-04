import {
  BattlePingSendPayloadSchema,
  type BattlePingEvent,
  type BattlePingSendPayload,
} from "@lootlog/schema/battle-ping";
import type { MapPingAck } from "@lootlog/schema/map-ping";
import { Schema, Context, Effect, Layer } from "effect";
import { ContextLogger } from "@lootlog/instrumentation";
import {
  consumePingRateLimit,
  getPingScopes,
  getPingSender,
  type PingScriptStore,
} from "#src/realtime/ping-routing";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";
import { GatewayRedis } from "#src/platform/redis-store";

const RATE_LIMIT = 8;

const RATE_LIMIT_WINDOW_MS = 10_000;

const isBattlePingSendPayload = Schema.is(BattlePingSendPayloadSchema);

export class BattlePingService {
  private readonly logger = new ContextLogger(BattlePingService.name);

  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  async send(
    socket: GatewaySocket,
    payload: BattlePingSendPayload,
  ): Promise<MapPingAck> {
    if (!isBattlePingSendPayload(payload))
      return { status: "rejected", code: "invalid-payload" };

    const sender = getPingSender(socket, payload.expectedMapId);

    if (!sender) return { status: "rejected", code: "invalid-context" };

    const recipientCharacterIds = payload.recipientCharacterIds.filter(
      (characterId) => characterId !== sender.characterId,
    );

    if (recipientCharacterIds.length === 0)
      return { status: "rejected", code: "invalid-payload" };

    const scopes = getPingScopes(socket, sender);

    if (scopes.length === 0) return { status: "rejected", code: "forbidden" };

    const pingId = crypto.randomUUID();

    const rateLimit = await consumePingRateLimit(this.redis, this.logger, {
      key: `battle-ping:rate:${socket.data.userId}`,
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: RATE_LIMIT,
      pingId,
    });

    if (!rateLimit)
      return { status: "rejected", code: "temporarily-unavailable" };
    const [accepted, createdAt, retryAfterMs] = rateLimit;

    if (accepted !== 1)
      return { status: "rejected", code: "rate-limited", retryAfterMs };

    const event: BattlePingEvent = {
      pingId,
      world: sender.world,
      mapId: sender.mapId,
      type: payload.type,
      warriorId: payload.warriorId,
      sender: { characterId: sender.characterId, name: sender.name },
      createdAt,
    };

    try {
      await this.hub.publishToScopes(
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
    } catch (error) {
      this.logger.warn("Failed to route battle ping", error);

      return { status: "rejected", code: "temporarily-unavailable" };
    }

    return { status: "accepted", pingId };
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
