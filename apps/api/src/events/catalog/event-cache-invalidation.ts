import { Effect } from "effect";
import type { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger } from "#src/shared/application-logger";

export const invalidateEventCachePatterns = (
  redis: Pick<RedisService, "deleteByPattern">,
  logger: Pick<ApplicationLogger, "warn">,
  patterns: string[],
  message: string,
) =>
  Effect.forEach(
    patterns,
    (pattern) =>
      Effect.tryPromise({
        try: () => redis.deleteByPattern(pattern),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => logger.warn(message, { error, pattern })),
        ),
      ),
    { concurrency: "unbounded", discard: true },
  );
