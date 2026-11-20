import {
  adapterOperation,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import { queryEventHero } from "#src/events/event-scope-query";
import { eventReadCacheScope } from "#src/events/catalog/event-read-cache.service";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import { and, eq, isNull } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
} from "#src/database/drizzle/event.schema";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { RedisService } from "#src/redis/redis.service";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import type {
  CloseRespawnWindowRequest,
  OpenRespawnWindowRequest,
} from "#src/contracts/events/schemas";
import type { EventTimersPort } from "#src/events/respawn/event-timers.port";
import { getEventHeroNpcId } from "@lootlog/domain/npc-identity";

export interface EventRespawnQueue {
  readonly delayed: () => Effect.Effect<
    ReadonlyArray<{
      readonly heroId: string;
      readonly remove: Effect.Effect<void, unknown>;
    }>,
    unknown
  >;
}

export interface EventRespawnPublisher {
  readonly publish: <
    Key extends
      | typeof RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE
      | typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED
      | typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
  >(
    routingKey: Key,
    payload: CanonicalRabbitEvent<Key>,
  ) => Effect.Effect<void, unknown>;
}

export interface EventManualKillRecorder {
  readonly record: (input: {
    readonly guildId: string;
    readonly hero: typeof eventHeroNpcTable.$inferSelect;
    readonly event: typeof eventTable.$inferSelect;
    readonly timer: {
      readonly minSpawnTime: Date;
      readonly maxSpawnTime: Date;
      readonly createdById: number | null;
      readonly windowOpenedAt: Date | null;
    };
  }) => Effect.Effect<void, unknown>;
}

export const makeEventRespawnCommands = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  timers: EventTimersPort,
  queue: EventRespawnQueue,
  publisher: EventRespawnPublisher,
  manualKill: EventManualKillRecorder,
) => {
  const query = adapterOperation("events.respawn.drizzle");

  const bestEffort = (
    operation: string,
    effect: Effect.Effect<void, unknown>,
  ) =>
    effect.pipe(
      Effect.catch((error) =>
        Effect.logWarning("Event respawn side effect failed", {
          error,
          operation,
        }),
      ),
      withAdapterSpan(operation, "events.respawn"),
    );

  const invalidate = (guildId: string, eventId: string) =>
    Effect.forEach(
      [
        eventReadCacheScope(guildId, "guild"),
        eventReadCacheScope(guildId, eventId),
      ],
      (scope) =>
        bestEffort("events.respawn.cache", redis.invalidateScopes(scope)),
      { concurrency: "unbounded", discard: true },
    );

  const publish = <
    Key extends
      | typeof RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE
      | typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED
      | typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
  >(
    routingKey: Key,
    payload: CanonicalRabbitEvent<Key>,
  ) =>
    bestEffort(
      "events.respawn.publish",
      publisher.publish(routingKey, payload),
    );

  const cancelAutoClose = (heroId: string) =>
    Effect.gen(function* () {
      const jobs = yield* queue.delayed();
      yield* Effect.forEach(
        jobs.filter((job) => job.heroId === heroId),
        (job) => job.remove,
        { concurrency: "unbounded", discard: true },
      );
    }).pipe(withAdapterSpan("events.respawn.cancelAutoClose", "events.bullmq"));

  return {
    open: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      data: OpenRespawnWindowRequest,
      actorMemberId: number,
    ) =>
      Effect.gen(function* () {
        const heroRows = yield* query(
          "events.respawn.open.hero",
          queryEventHero(database, guild.id, eventId, heroId),
        );

        const row = heroRows[0];

        if (!row)
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );

        const minSpawnTime = new Date(data.minSpawnTime);
        const maxSpawnTime = new Date(data.maxSpawnTime);

        const timer = yield* timers.openEventRespawnTimer({
          guildId: guild.id,
          world: row.event.world,
          npcId: getEventHeroNpcId(row.hero),
          npcName: row.hero.npcName,
          npcIcon: row.hero.npcIcon ?? null,
          minSpawnTime,
          maxSpawnTime,
          createdById: actorMemberId,
          isUsingSyntheticId: row.hero.npcId === null,
        });

        yield* cancelAutoClose(heroId);

        const maps = yield* query(
          "events.respawn.open.maps",
          database
            .select()
            .from(eventMapTable)
            .where(eq(eventMapTable.heroNpcId, heroId)),
        );

        const assignments =
          maps.length === 0
            ? []
            : yield* query(
                "events.respawn.open.assignments",
                database
                  .select({ mapId: eventMapToMemberTable.A })
                  .from(eventMapToMemberTable)
                  .innerJoin(
                    eventMapTable,
                    eq(eventMapTable.id, eventMapToMemberTable.A),
                  )
                  .innerJoin(
                    memberTable,
                    eq(memberTable.id, eventMapToMemberTable.B),
                  )
                  .where(
                    and(
                      eq(eventMapTable.heroNpcId, heroId),
                      eq(memberTable.active, true),
                    ),
                  ),
              );

        const assignedMapIds = new Set(assignments.map(({ mapId }) => mapId));

        const windowOpenedAt =
          timer.windowOpenedAt ?? new Date(yield* Clock.currentTimeMillis);

        yield* Effect.forEach(
          maps,
          (map) => {
            const gapType = assignedMapIds.has(map.id)
              ? ("UNCOVERED" as const)
              : ("UNASSIGNED" as const);

            return query(
              "events.respawn.open.gap",
              database
                .select({ id: eventMapCoverageGapTable.id })
                .from(eventMapCoverageGapTable)
                .where(
                  and(
                    eq(eventMapCoverageGapTable.mapId, map.id),
                    eq(eventMapCoverageGapTable.gapType, gapType),
                    isNull(eventMapCoverageGapTable.endedAt),
                  ),
                )
                .limit(1),
            ).pipe(
              Effect.flatMap((existing) =>
                existing[0]
                  ? Effect.void
                  : query(
                      "events.respawn.open.gap.insert",
                      database.insert(eventMapCoverageGapTable).values({
                        id: Bun.randomUUIDv7(),
                        mapId: map.id,
                        heroNpcId: heroId,
                        gapType,
                        startedAt: windowOpenedAt,
                      }),
                    ).pipe(Effect.asVoid),
              ),
            );
          },
          { concurrency: 1, discard: true },
        );
        yield* Effect.all(
          [
            invalidate(guild.id, eventId),
            publish(RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED, {
              guildId: guild.id,
              eventId,
              heroId,
              heroNpcLvl: row.hero.npcLvl,
            }),
            Effect.forEach(
              maps,
              (map) =>
                publish(RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE, {
                  guildId: guild.id,
                  eventId,
                  mapId: map.id,
                  heroNpcLvl: row.hero.npcLvl,
                }),
              { concurrency: "unbounded", discard: true },
            ),
          ],
          { concurrency: "unbounded", discard: true },
        );

        return { success: true, minSpawnTime, maxSpawnTime };
      }).pipe(Effect.withSpan("EventsMonitoringController_openRespawnWindow")),

    close: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      data: CloseRespawnWindowRequest,
      actorMemberId: number,
    ) =>
      Effect.gen(function* () {
        const heroRows = yield* query(
          "events.respawn.close.hero",
          queryEventHero(database, guild.id, eventId, heroId),
        );

        const row = heroRows[0];

        if (!row) {
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );
        }

        const timerLookup = {
          guildId: guild.id,
          world: row.event.world,
          npcId: getEventHeroNpcId(row.hero),
          npcName: row.hero.npcName,
        };

        const timer = yield* timers.getEventRespawnTimer(timerLookup);

        if (timer) {
          yield* manualKill.record({
            guildId: guild.id,
            hero: row.hero,
            event: row.event,
            timer,
          });
          yield* timers.closeEventRespawnTimer(timerLookup);
        }

        yield* cancelAutoClose(heroId);
        yield* Effect.all(
          [
            invalidate(guild.id, eventId),
            publish(RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED, {
              guildId: guild.id,
              eventId,
              heroId,
              heroNpcLvl: row.hero.npcLvl,
            }),
          ],
          { concurrency: "unbounded", discard: true },
        );

        if (data.createNewWindow) {
          if (!data.newMinSpawnTime || !data.newMaxSpawnTime) {
            return yield* Effect.fail(
              new InvalidRequestError(
                "Missing spawn window bounds for new window",
              ),
            );
          }

          yield* makeEventRespawnCommands(
            database,
            redis,
            timers,
            queue,
            publisher,
            manualKill,
          ).open(
            guild,
            eventId,
            heroId,
            {
              minSpawnTime: data.newMinSpawnTime,
              maxSpawnTime: data.newMaxSpawnTime,
            },
            actorMemberId,
          );
        }

        return { success: true };
      }).pipe(Effect.withSpan("EventsMonitoringController_closeRespawnWindow")),
  };
};

export type EventRespawnCommands = ReturnType<typeof makeEventRespawnCommands>;
