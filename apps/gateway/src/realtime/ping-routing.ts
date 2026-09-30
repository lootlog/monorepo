import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import { Schema } from "effect";
import type { Logger } from "#src/platform/logger";
import type {
  RedisGatewayStore,
  RedisScriptReply,
} from "#src/platform/redis-store";
import type { GatewaySocket } from "#src/realtime/session";
import { canSubscribe } from "#src/realtime/subscription-policy";

const RATE_LIMIT_SCRIPT = slidingWindowRateLimitScript({
  refreshExpiryOnReject: true,
  includeTimestamp: true,
});

const decodeRateLimitReply = Schema.decodeUnknownSync(
  Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]),
);

export type PingScriptStore = {
  command: {
    eval(
      ...args: Parameters<RedisGatewayStore["command"]["eval"]>
    ): Promise<RedisScriptReply>;
  };
};

export interface PingSender {
  readonly world: string;
  readonly mapId: number;
  readonly characterId: string;
  readonly name: string;
}

/** The sender's verified game location, or null when it no longer matches the client's map. */
export const getPingSender = (
  socket: GatewaySocket,
  expectedMapId: number,
): PingSender | null => {
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
};

/** Every Organization in which the sender may share pings for its current map. */
export const getPingScopes = (
  socket: GatewaySocket,
  sender: PingSender,
): SubscriptionScope[] =>
  socket.data.guilds.flatMap(({ guild }) => {
    const scope = {
      topic: "map.pings" as const,
      organizationId: guild.id,
      world: sender.world,
      mapId: sender.mapId,
    };

    return canSubscribe(socket.data, scope) ? [scope] : [];
  });

/**
 * Records one ping in a sliding window and returns `[accepted, createdAt, retryAfterMs]`,
 * or null when Redis cannot decide, so the caller fails closed.
 */
export const consumePingRateLimit = async (
  redis: PingScriptStore,
  logger: Pick<Logger, "warn">,
  options: {
    readonly key: string;
    readonly windowMs: number;
    readonly limit: number;
    readonly pingId: string;
  },
): Promise<readonly [number, number, number] | null> => {
  try {
    const result = await redis.command.eval(
      RATE_LIMIT_SCRIPT,
      1,
      options.key,
      options.windowMs,
      options.limit,
      options.pingId,
    );

    if (!Array.isArray(result)) return null;

    return decodeRateLimitReply(result.map(Number));
  } catch (error) {
    logger.warn("Failed to apply ping rate limit", error);

    return null;
  }
};
