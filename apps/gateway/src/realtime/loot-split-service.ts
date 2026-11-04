import {
  LootSplitAutoAcceptPayloadSchema,
  LootSplitSendPayloadSchema,
  type LootSplitAck,
  type LootSplitAutoAcceptedEvent,
  type LootSplitAutoAcceptPayload,
  type LootSplitEvent,
  type LootSplitSendPayload,
} from "@lootlog/schema/loot-split";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Schema, Context, Effect, Layer } from "effect";
import {
  relayWithRateLimit,
  getPingScopes,
  type PingScriptStore,
} from "#src/realtime/ping-routing";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";
import { GatewayRedis } from "#src/platform/redis-store";
import type { CommandRoutes } from "#src/realtime/command-routes";

/**
 * A choice change, an accept, and the frame a new fight sends for the split
 * it closes: a few per split, so this only stops a misbehaving client.
 */
const RATE_LIMIT = 30;

const RATE_LIMIT_WINDOW_MS = 10_000;

const isLootSplitSendPayload = Schema.is(LootSplitSendPayloadSchema);

const isLootSplitAutoAcceptPayload = Schema.is(
  LootSplitAutoAcceptPayloadSchema,
);

type LootSplitRelayedEvent = Extract<
  typeof ServerEvent.Type,
  { type: "loot-split.received" | "loot-split.auto-accepted" }
>;

/**
 * Relays one participant's choices in a group loot split, or the accept their
 * loot filter made, to the split's other participants. Nothing is stored: the split lasts seconds, and a
 * client that missed a frame keeps the last state it has.
 */
export class LootSplitService {
  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  send(
    socket: GatewaySocket,
    payload: LootSplitSendPayload,
  ): Effect.Effect<LootSplitAck> {
    if (!isLootSplitSendPayload(payload))
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });

    return this.relay(
      socket,
      payload.recipientCharacterIds,
      (sender, world, sentAt) => ({
        v: 1,
        type: "loot-split.received",
        data: {
          splitId: payload.splitId,
          world,
          sender,
          choices: payload.choices,
          accepted: payload.accepted,
          sentAt,
        } satisfies LootSplitEvent,
      }),
    );
  }

  /** Tells the fight's other players that the sender's loot filter accepted. */
  autoAccept(
    socket: GatewaySocket,
    payload: LootSplitAutoAcceptPayload,
  ): Effect.Effect<LootSplitAck> {
    if (!isLootSplitAutoAcceptPayload(payload))
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });

    return this.relay(
      socket,
      payload.recipientCharacterIds,
      (sender, world, sentAt) => ({
        v: 1,
        type: "loot-split.auto-accepted",
        data: { world, sender, sentAt } satisfies LootSplitAutoAcceptedEvent,
      }),
    );
  }

  private relay(
    socket: GatewaySocket,
    requestedRecipientCharacterIds: readonly string[],
    buildEvent: (
      sender: LootSplitEvent["sender"],
      world: string,
      sentAt: number,
    ) => LootSplitRelayedEvent,
  ): Effect.Effect<LootSplitAck> {
    const { redis, hub } = this;
    const character = socket.data.presence?.character;

    if (
      socket.data.platform !== "game" ||
      !character?.world ||
      !character.characterId ||
      !character.name
    )
      return Effect.succeed({ status: "rejected", code: "invalid-context" });

    const { world, characterId, name } = character;

    const recipientCharacterIds = requestedRecipientCharacterIds.filter(
      (recipient) => recipient !== characterId,
    );

    if (recipientCharacterIds.length === 0)
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });

    // Participants stay on one world but may leave the map, so no map.
    const scopes = getPingScopes(socket, { world });

    if (scopes.length === 0)
      return Effect.succeed({ status: "rejected", code: "forbidden" });

    return relayWithRateLimit({
      redis,
      context: "LootSplitService",
      rateLimit: {
        key: `loot-split:rate:${socket.data.userId}`,
        windowMs: RATE_LIMIT_WINDOW_MS,
        limit: RATE_LIMIT,
        pingId: crypto.randomUUID(),
      },
      publish: (sentAt) =>
        hub.publishToScopes(
          scopes,
          buildEvent({ characterId, name }, world, sentAt),
          {
            excludeConnectionId: socket.data.connectionId,
            recipientPlatform: "game",
            recipientWorld: world,
            recipientCharacterIds,
          },
        ),
      failure: "Failed to route loot split choices",
      accepted: { status: "accepted" } as const,
    });
  }
}

/** Relays loot split choices to the split's participants. */
export class LootSplits extends Context.Service<LootSplits, LootSplitService>()(
  "@lootlog/gateway/realtime/LootSplits",
) {
  static readonly layer = Layer.effect(
    LootSplits,
    Effect.gen(function* () {
      return new LootSplitService(yield* GatewayRedis, yield* Hub);
    }),
  );
}

/** Loot split choices and filter accepts are relayed, never stored. */
export const lootSplitRoutes = (
  lootSplits: Pick<LootSplitService, "send" | "autoAccept">,
) =>
  ({
    "loot-split.send": {
      joined: true,
      run: (socket, data) => lootSplits.send(socket, data),
    },
    "loot-split.auto-accept": {
      joined: true,
      run: (socket, data) => lootSplits.autoAccept(socket, data),
    },
  }) satisfies Pick<
    CommandRoutes,
    "loot-split.send" | "loot-split.auto-accept"
  >;
