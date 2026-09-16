import { Effect } from "effect";
import type { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger } from "#src/shared/application-logger";
import { eventReadCacheScope } from "#src/events/catalog/event-read-cache.service";

export const invalidateEventCache = (
  redis: Pick<RedisService, "invalidateScopes" | "deleteByPattern">,
  logger: Pick<ApplicationLogger, "warn">,
  guildId: string,
  eventId: string,
  message: string,
  wrappedPattern?: string,
) => {
  const invalidate = (operation: () => Promise<void | number>) =>
    Effect.tryPromise({ try: operation, catch: (cause) => cause }).pipe(
      Effect.catch((error) =>
        Effect.sync(() => logger.warn(message, { error })),
      ),
    );

  return Effect.all(
    [
      ...[
        eventReadCacheScope(guildId, "guild"),
        eventReadCacheScope(guildId, eventId),
      ].map((scope) => invalidate(() => redis.invalidateScopes(scope))),
      ...(wrappedPattern
        ? [invalidate(() => redis.deleteByPattern(wrappedPattern))]
        : []),
    ],
    { concurrency: "unbounded", discard: true },
  );
};
