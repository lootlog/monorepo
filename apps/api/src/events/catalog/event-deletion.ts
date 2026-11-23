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
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";

export const makeEventDeletion =
  (
    database: typeof ApiDatabase.Service,
    redis: Pick<RedisService, "deleteByPattern" | "invalidateScopes">,
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
        return yield* new ResourceNotFoundError("Event not found");
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
        return yield* new ResourceNotFoundError("Hero not found");
      }

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
