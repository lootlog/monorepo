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
import { Schema } from "effect";
import { ContextLogger } from "@lootlog/instrumentation";
import {
  consumePingRateLimit,
  getPingScopes,
  type PingScriptStore,
} from "#src/realtime/ping-routing";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";

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
  private readonly logger = new ContextLogger(LootSplitService.name);

  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  send(
    socket: GatewaySocket,
    payload: LootSplitSendPayload,
  ): Promise<LootSplitAck> {
    if (!isLootSplitSendPayload(payload))
      return Promise.resolve({ status: "rejected", code: "invalid-payload" });

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
  ): Promise<LootSplitAck> {
    if (!isLootSplitAutoAcceptPayload(payload))
      return Promise.resolve({ status: "rejected", code: "invalid-payload" });

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

  private async relay(
    socket: GatewaySocket,
    requestedRecipientCharacterIds: readonly string[],
    buildEvent: (
      sender: LootSplitEvent["sender"],
      world: string,
      sentAt: number,
    ) => LootSplitRelayedEvent,
  ): Promise<LootSplitAck> {
    const character = socket.data.presence?.character;

    if (
      socket.data.platform !== "game" ||
      !character?.world ||
      !character.characterId ||
      !character.name
    )
      return { status: "rejected", code: "invalid-context" };

    const recipientCharacterIds = requestedRecipientCharacterIds.filter(
      (characterId) => characterId !== character.characterId,
    );

    if (recipientCharacterIds.length === 0)
      return { status: "rejected", code: "invalid-payload" };

    // Participants stay on one world but may leave the map, so no map.
    const scopes = getPingScopes(socket, { world: character.world });

    if (scopes.length === 0) return { status: "rejected", code: "forbidden" };

    const rateLimit = await consumePingRateLimit(this.redis, this.logger, {
      key: `loot-split:rate:${socket.data.userId}`,
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: RATE_LIMIT,
      pingId: crypto.randomUUID(),
    });

    if (!rateLimit)
      return { status: "rejected", code: "temporarily-unavailable" };
    const [accepted, sentAt, retryAfterMs] = rateLimit;

    if (accepted !== 1)
      return { status: "rejected", code: "rate-limited", retryAfterMs };

    const event = buildEvent(
      { characterId: character.characterId, name: character.name },
      character.world,
      sentAt,
    );

    try {
      await this.hub.publishToScopes(scopes, event, {
        excludeConnectionId: socket.data.connectionId,
        recipientPlatform: "game",
        recipientWorld: character.world,
        recipientCharacterIds,
      });
    } catch (error) {
      this.logger.warn("Failed to route loot split choices", error);

      return { status: "rejected", code: "temporarily-unavailable" };
    }

    return { status: "accepted" };
  }
}
