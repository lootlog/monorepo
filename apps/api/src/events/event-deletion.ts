import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { eventTable } from "#src/database/drizzle/schema";
import type { RedisService } from "#src/redis/redis.service";
import { getEventWrappedCachePattern } from "#src/shared/constants/cache.constant";
import { NotFoundException } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";

interface EventDeletionJob {
  readonly eventId: string;
  readonly remove: () => Promise<unknown>;
}

export interface EventDeletionQueue {
  readonly pending: () => Promise<ReadonlyArray<EventDeletionJob>>;
  readonly delayed: () => Promise<ReadonlyArray<EventDeletionJob>>;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventDeletionError extends Schema.TaggedError<EventDeletionError>()(
  "EventDeletionError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventDeletion =
  (
    database: typeof ApiDatabase.Service,
    redis: RedisService,
    queue: EventDeletionQueue,
    logger: Logger,
  ) =>
  (guild: { id: string }, eventId: string) =>
    Effect.gen(function* () {
      const rows = yield* database
        .select({ id: eventTable.id })
        .from(eventTable)
        .where(
          and(eq(eventTable.id, eventId), eq(eventTable.guildId, guild.id)),
        )
        .limit(1)
        .pipe(
          Effect.mapError(
            (cause) =>
              new EventDeletionError({
                operation: "events.delete.find",
                cause,
              }),
          ),
        );
      if (!rows[0]) {
        return yield* Effect.fail(new NotFoundException("Event not found"));
      }

      const jobs = yield* Effect.all({
        pending: Effect.tryPromise({
          try: queue.pending,
          catch: (cause) =>
            new EventDeletionError({
              operation: "events.delete.pendingJobs",
              cause,
            }),
        }),
        delayed: Effect.tryPromise({
          try: queue.delayed,
          catch: (cause) =>
            new EventDeletionError({
              operation: "events.delete.delayedJobs",
              cause,
            }),
        }),
      });
      yield* Effect.forEach(
        [...jobs.pending, ...jobs.delayed].filter(
          (job) => job.eventId === eventId,
        ),
        (job) =>
          Effect.tryPromise({ try: job.remove, catch: () => undefined }).pipe(
            Effect.ignore,
          ),
        { concurrency: "unbounded", discard: true },
      );

      yield* database
        .delete(eventTable)
        .where(
          and(eq(eventTable.id, eventId), eq(eventTable.guildId, guild.id)),
        )
        .pipe(
          Effect.mapError(
            (cause) =>
              new EventDeletionError({
                operation: "events.delete.transaction",
                cause,
              }),
          ),
          Effect.withSpan("events.delete.transaction", {
            attributes: { adapter: "events.drizzle", retryCount: 0 },
          }),
        );

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
    }).pipe(Effect.withSpan("EventsController_deleteEvent"));

export type EventDeletion = ReturnType<typeof makeEventDeletion>;
