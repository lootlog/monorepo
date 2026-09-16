import { Logger } from "#src/shared/application-logger";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import superjson from "superjson";
import { Effect, Schema } from "effect";
import { stableJsonStringify } from "@lootlog/schema/stable-json";

const EVENT_READ_CACHE_PREFIX = "event-read:v2";

const EVENT_READ_CACHE_TTL_SECONDS = 10;

export const eventReadCacheScope = (guildId: string, eventId?: string) =>
  eventId === undefined
    ? `${EVENT_READ_CACHE_PREFIX}:${guildId}`
    : `${EVENT_READ_CACHE_PREFIX}:${guildId}:${eventId}`;

export const eventReadCacheEntry = <Params extends object>(
  guildId: string,
  eventId: string,
  view: string,
  params?: Params,
) => ({
  key: [
    EVENT_READ_CACHE_PREFIX,
    guildId,
    eventId,
    view,
    Buffer.from(stableJsonStringify(params ?? {})).toString("base64url"),
  ].join(":"),
  scopes: [eventReadCacheScope(guildId), eventReadCacheScope(guildId, eventId)],
});

export const makeEventReadCache = (
  redis: Pick<RedisService, "invalidateScopes" | "getOrSetJsonEffect">,
) => {
  const logger = new Logger("EventReadCache");

  const invalidateScopes = async (scope: string) => {
    try {
      await redis.invalidateScopes(scope);
    } catch (error) {
      logger.warn("Failed to invalidate event read cache", error);
    }
  };

  return {
    getGuildEntry<Params extends object>(
      guildId: string,
      scope: string,
      params?: Params,
    ) {
      return eventReadCacheEntry(guildId, "guild", scope, params ?? {});
    },

    getEventEntry<Params extends object>(
      guildId: string,
      eventId: string,
      scope: string,
      params?: Params,
    ) {
      return eventReadCacheEntry(guildId, eventId, scope, params ?? {});
    },

    getOrSet<S extends Schema.ConstraintDecoder<unknown>, E>(
      entry: ReturnType<typeof eventReadCacheEntry>,
      schema: S,
      factory: () => Effect.Effect<S["Type"], E>,
    ): Effect.Effect<S["Type"], E> {
      const codec = makeJsonCodec(Schema.toType(schema), superjson);

      return redis.getOrSetJsonEffect({
        ...entry,
        codec,
        ttlSeconds: EVENT_READ_CACHE_TTL_SECONDS,
        factory: Effect.suspend(factory),
        onError: (error) => logger.warn("Event read cache unavailable", error),
      });
    },

    async invalidateGuild(guildId: string) {
      await invalidateScopes(eventReadCacheScope(guildId));
    },

    async invalidateEvent(guildId: string, eventId: string) {
      await Promise.all([
        invalidateScopes(eventReadCacheScope(guildId, "guild")),
        invalidateScopes(eventReadCacheScope(guildId, eventId)),
      ]);
    },
  };
};

export type EventReadCache = ReturnType<typeof makeEventReadCache>;
