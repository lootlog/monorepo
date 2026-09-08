import { Logger } from "#src/shared/application-logger";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import superjson from "superjson";
import { Effect, Schema } from "effect";
import { stableJsonStringify } from "@lootlog/schema/stable-json";

const EVENT_READ_CACHE_PREFIX = "event-read:v2";
const EVENT_READ_CACHE_TTL_SECONDS = 10;

export const makeEventReadCache = (
  redis: Pick<RedisService, "deleteByPattern" | "getOrSetJsonEffect">,
) => {
  const logger = new Logger("EventReadCache");
  const buildKey = <Params extends object>(
    guildId: string,
    eventSegment: string,
    scope: string,
    params: Params,
  ) =>
    [
      EVENT_READ_CACHE_PREFIX,
      guildId,
      eventSegment,
      scope,
      Buffer.from(stableJsonStringify(params)).toString("base64url"),
    ].join(":");

  const deleteByPattern = async (pattern: string) => {
    try {
      await redis.deleteByPattern(pattern);
    } catch (error) {
      logger.warn("Failed to invalidate event read cache", error);
    }
  };

  return {
    getGuildKey<Params extends object>(
      guildId: string,
      scope: string,
      params?: Params,
    ) {
      return buildKey(guildId, "guild", scope, params ?? {});
    },

    getEventKey<Params extends object>(
      guildId: string,
      eventId: string,
      scope: string,
      params?: Params,
    ) {
      return buildKey(guildId, eventId, scope, params ?? {});
    },

    getOrSet<S extends Schema.ConstraintDecoder<unknown>, E>(
      key: string,
      schema: S,
      factory: () => Effect.Effect<S["Type"], E>,
    ): Effect.Effect<S["Type"], E> {
      const codec = makeJsonCodec(Schema.toType(schema), superjson);
      return redis.getOrSetJsonEffect({
        key,
        codec,
        ttlSeconds: EVENT_READ_CACHE_TTL_SECONDS,
        factory: Effect.suspend(factory),
        onError: (error) => logger.warn("Event read cache unavailable", error),
      });
    },

    async invalidateGuild(guildId: string) {
      await deleteByPattern(`${EVENT_READ_CACHE_PREFIX}:${guildId}:*`);
    },

    async invalidateEvent(guildId: string, eventId: string) {
      await Promise.all([
        deleteByPattern(`${EVENT_READ_CACHE_PREFIX}:${guildId}:guild:*`),
        deleteByPattern(`${EVENT_READ_CACHE_PREFIX}:${guildId}:${eventId}:*`),
      ]);
    },
  };
};

export type EventReadCache = ReturnType<typeof makeEventReadCache>;
