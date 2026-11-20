import { makeTypeJsonCodec, type RedisService } from "#src/redis/redis.service";
import { Effect, Schema } from "effect";
import { stableJsonCacheKey } from "@lootlog/schema/stable-json";

const EVENT_READ_CACHE_PREFIX = "event-read:v3";

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
    stableJsonCacheKey(params ?? {}),
  ].join(":"),
  scopes: [eventReadCacheScope(guildId), eventReadCacheScope(guildId, eventId)],
});

export const makeEventReadCache = (
  redis: Pick<RedisService, "invalidateScopes" | "getOrSetJson">,
) => {
  const withContext = Effect.annotateLogs({ context: "EventReadCache" });

  const invalidateScopes = (scope: string) =>
    redis
      .invalidateScopes(scope)
      .pipe(
        Effect.catch((error) =>
          Effect.logWarning(
            "Failed to invalidate event read cache",
            error,
          ).pipe(withContext),
        ),
      );

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
      const codec = makeTypeJsonCodec(schema);

      return redis.getOrSetJson({
        ...entry,
        codec,
        ttlSeconds: EVENT_READ_CACHE_TTL_SECONDS,
        factory: Effect.suspend(factory),
        onError: (error) =>
          Effect.logWarning("Event read cache unavailable", error).pipe(
            withContext,
          ),
      });
    },

    invalidateEvent(guildId: string, eventId: string): Effect.Effect<void> {
      return Effect.all(
        [
          invalidateScopes(eventReadCacheScope(guildId, "guild")),
          invalidateScopes(eventReadCacheScope(guildId, eventId)),
        ],
        { concurrency: "unbounded", discard: true },
      );
    },
  };
};

export type EventReadCache = ReturnType<typeof makeEventReadCache>;
