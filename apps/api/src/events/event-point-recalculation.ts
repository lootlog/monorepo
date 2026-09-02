import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { eventTable } from "#src/database/drizzle/schema";
import type { RedisService } from "#src/redis/redis.service";
import { getEventWrappedCachePattern } from "#src/shared/constants/cache.constant";
import { NotFoundException } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";

export interface EventPointRecalculator {
  readonly recalculate: (
    eventId: string,
    basePointsPerKill: number,
  ) => Effect.Effect<void, unknown>;
}

export class EventPointRecalculationError extends TaggedErrorClass<EventPointRecalculationError>()(
  "EventPointRecalculationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventPointRecalculation =
  (
    database: typeof ApiDatabase.Service,
    redis: RedisService,
    points: EventPointRecalculator,
    logger: Logger,
  ) =>
  (guild: { id: string }, eventId: string) =>
    Effect.gen(function* () {
      const rows = yield* database
        .select({
          id: eventTable.id,
          basePointsPerKill: eventTable.basePointsPerKill,
        })
        .from(eventTable)
        .where(
          and(eq(eventTable.id, eventId), eq(eventTable.guildId, guild.id)),
        )
        .limit(1)
        .pipe(
          Effect.mapError(
            (cause) =>
              new EventPointRecalculationError({
                operation: "events.points.findEvent",
                cause,
              }),
          ),
        );
      const event = rows[0];
      if (!event) {
        return yield* Effect.fail(new NotFoundException("Event not found"));
      }
      yield* points.recalculate(event.id, event.basePointsPerKill);
      yield* Effect.forEach(
        [
          getEventWrappedCachePattern(guild.id, eventId),
          `event-read:v2:${guild.id}:guild:*`,
          `event-read:v2:${guild.id}:${eventId}:*`,
        ],
        (pattern) =>
          Effect.tryPromise({
            try: () => redis.deleteByPattern(pattern),
            catch: (cause) => cause,
          }).pipe(
            Effect.catch((error) =>
              Effect.sync(() =>
                logger.warn("Failed to invalidate event cache", {
                  error,
                  pattern,
                }),
              ),
            ),
          ),
        { concurrency: "unbounded", discard: true },
      );
      return { success: true };
    }).pipe(Effect.withSpan("EventsController_recalculateEventPoints"));

export type EventPointRecalculation = ReturnType<
  typeof makeEventPointRecalculation
>;
