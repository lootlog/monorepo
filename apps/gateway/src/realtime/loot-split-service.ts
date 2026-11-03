import {
  LootSplitSendPayloadSchema,
  type LootSplitAck,
  type LootSplitEvent,
  type LootSplitSendPayload,
} from "@lootlog/schema/loot-split";
import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import { Schema } from "effect";
import { ContextLogger } from "@lootlog/instrumentation";
import {
  consumePingRateLimit,
  type PingScriptStore,
} from "#src/realtime/ping-routing";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";
import { canSubscribe } from "#src/realtime/subscription-policy";

/**
 * A choice change, an accept, and the frame a new fight sends for the split
 * it closes: a few per split, so this only stops a misbehaving client.
 */
const RATE_LIMIT = 30;

const RATE_LIMIT_WINDOW_MS = 10_000;

const isLootSplitSendPayload = Schema.is(LootSplitSendPayloadSchema);

/**
 * Every Organization of the sender in which it may show itself to other
 * players of its world. Participants of one split stay on one world but may
 * leave the map, so the scope names no map.
 */
const getLootSplitScopes = (
  socket: GatewaySocket,
  world: string,
): SubscriptionScope[] =>
  socket.data.guilds.flatMap(({ guild }) => {
    const scope = {
      topic: "map.pings" as const,
      organizationId: guild.id,
      world,
    };

    return canSubscribe(socket.data, scope) ? [scope] : [];
  });

/**
 * Relays one participant's choices in a group loot split to the split's
 * other participants. Nothing is stored: the split lasts seconds, and a
 * client that missed a frame keeps the last state it has.
 */
export class LootSplitService {
  private readonly logger = new ContextLogger(LootSplitService.name);

  constructor(
    private readonly redis: PingScriptStore,
    private readonly hub: Pick<RealtimeHub, "publishToScopes">,
  ) {}

  async send(
    socket: GatewaySocket,
    payload: LootSplitSendPayload,
  ): Promise<LootSplitAck> {
    if (!isLootSplitSendPayload(payload))
      return { status: "rejected", code: "invalid-payload" };

    const character = socket.data.presence?.character;

    if (
      socket.data.platform !== "game" ||
      !character?.world ||
      !character.characterId ||
      !character.name
    )
      return { status: "rejected", code: "invalid-context" };

    const recipientCharacterIds = payload.recipientCharacterIds.filter(
      (characterId) => characterId !== character.characterId,
    );

    if (recipientCharacterIds.length === 0)
      return { status: "rejected", code: "invalid-payload" };

    const scopes = getLootSplitScopes(socket, character.world);

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

    const event: LootSplitEvent = {
      splitId: payload.splitId,
      world: character.world,
      sender: { characterId: character.characterId, name: character.name },
      choices: payload.choices,
      accepted: payload.accepted,
      sentAt,
    };

    try {
      await this.hub.publishToScopes(
        scopes,
        { v: 1, type: "loot-split.received", data: event },
        {
          excludeConnectionId: socket.data.connectionId,
          recipientPlatform: "game",
          recipientWorld: character.world,
          recipientCharacterIds,
        },
      );
    } catch (error) {
      this.logger.warn("Failed to route loot split choices", error);

      return { status: "rejected", code: "temporarily-unavailable" };
    }

    return { status: "accepted" };
  }
}
