import {
  OperationError,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { filterHeroesByLevel } from "@lootlog/domain/event-hero-visibility";
import { invalidateEventCache } from "#src/events/catalog/event-cache-invalidation";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventTable,
  eventHeroNpcTable,
} from "#src/database/drizzle/event.schema";
import type { roleTable } from "#src/database/drizzle/organization.schema";
import type { RedisService } from "#src/redis/redis.service";
import { getEventWrappedCachePattern } from "#src/shared/cache";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";

interface EventDeletionJob {
  readonly eventId: string;
  readonly remove: () => Promise<void>;
}

export interface EventDeletionQueue {
  readonly pending: () => Promise<ReadonlyArray<EventDeletionJob>>;
  readonly delayed: () => Promise<ReadonlyArray<EventDeletionJob>>;
}

export const makeEventDeletion =
  (
    database: typeof ApiDatabase.Service,
    redis: Pick<RedisService, "deleteByPattern" | "invalidateScopes">,
    queue: EventDeletionQueue,
  ) =>
  (
    guild: { id: string },
    eventId: string,
    roles: Array<typeof roleTable.$inferSelect>,
    accessPolicy: AccessPolicy,
  ) =>
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
              new OperationError({
                operation: "events.delete.find",
                cause,
              }),
          ),
        );

      if (!rows[0]) {
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      }

      const heroes = yield* database
        .select()
        .from(eventHeroNpcTable)
        .where(eq(eventHeroNpcTable.eventId, eventId))
        .pipe(
          Effect.mapError(
            (cause) =>
              new OperationError({
                operation: "events.delete.heroes",
                cause,
              }),
          ),
        );

      if (
        filterHeroesByLevel(
          heroes,
          roles,
          getEffectiveCapabilities(accessPolicy),
        ).length !== heroes.length
      ) {
        return yield* Effect.fail(new ResourceNotFoundError("Hero not found"));
      }

      const jobs = yield* Effect.all(
        {
          pending: Effect.tryPromise({
            try: queue.pending,
            catch: (cause) =>
              new OperationError({
                operation: "events.delete.pendingJobs",
                cause,
              }),
          }),
          delayed: Effect.tryPromise({
            try: queue.delayed,
            catch: (cause) =>
              new OperationError({
                operation: "events.delete.delayedJobs",
                cause,
              }),
          }),
        },
        { concurrency: "unbounded" },
      );

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
              new OperationError({
                operation: "events.delete.transaction",
                cause,
              }),
          ),
          withAdapterSpan("events.delete.transaction", "events.drizzle"),
        );

      yield* invalidateEventCache(
        redis,
        guild.id,
        eventId,
        "Failed to invalidate event cache",
        getEventWrappedCachePattern(guild.id, eventId),
      );

      return { success: true };
    }).pipe(Effect.withSpan("EventsController_deleteEvent"));

export type EventDeletion = ReturnType<typeof makeEventDeletion>;
