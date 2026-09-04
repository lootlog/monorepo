import { Logger } from "#src/shared/application-logger";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import superjson from "superjson";
import { Effect, Schema } from "effect";
import { stableJsonStringify } from "@lootlog/schema/stable-json";

const EVENT_READ_CACHE_PREFIX = "event-read:v2";
const EVENT_READ_CACHE_TTL_SECONDS = 10;

const superJsonSerialization = {
  stringify: (value: unknown) => superjson.stringify(value),
  parse: (text: string): unknown => superjson.parse(text),
};

export const makeEventReadCache = (redis: RedisService) => {
  const logger = new Logger("EventReadCache");
  const buildKey = (
    guildId: string,
    eventSegment: string,
    scope: string,
    params: Record<string, unknown>,
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
    getGuildKey(
      guildId: string,
      scope: string,
      params: Record<string, unknown> = {},
    ) {
      return buildKey(guildId, "guild", scope, params);
    },

    getEventKey(
      guildId: string,
      eventId: string,
      scope: string,
      params: Record<string, unknown> = {},
    ) {
      return buildKey(guildId, eventId, scope, params);
    },

    getOrSet<S extends Schema.ConstraintDecoder<unknown>, E>(
      key: string,
      schema: S,
      factory: () => Effect.Effect<S["Type"], E>,
    ): Effect.Effect<S["Type"], E> {
      const codec = makeJsonCodec(
        Schema.toType(schema),
        superJsonSerialization,
      );
      return Effect.gen(function* () {
        const cached = yield* Effect.tryPromise(() =>
          redis.getJson(key, codec),
        ).pipe(
          Effect.catch((error) => {
            logger.warn("Event read cache unavailable", error);
            return Effect.succeed(null);
          }),
        );
        if (cached !== null) return cached;
        const value = yield* factory();
        yield* Effect.tryPromise(() =>
          redis.setJson(key, value, EVENT_READ_CACHE_TTL_SECONDS, codec),
        ).pipe(
          Effect.catch((error) => {
            logger.warn("Event read cache unavailable", error);
            return Effect.void;
          }),
        );
        return value;
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
