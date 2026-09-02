import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
  memberTable,
} from "#src/database/drizzle/schema";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { RedisService } from "#src/redis/redis.service";
import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type {
  CloseRespawnWindowDto,
  OpenRespawnWindowDto,
} from "#src/http-api/lootlog-api";
import type { EventTimersPort } from "./services/event-timers.port.js";
import { getSyntheticNpcId } from "./utils/get-synthetic-npc-id.js";

export class EventRespawnCommandError extends TaggedErrorClass<EventRespawnCommandError>()(
  "EventRespawnCommandError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

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
  readonly publish: (
    routingKey: RoutingKey,
    payload: unknown,
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
  logger: Logger,
) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new EventRespawnCommandError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.respawn.drizzle", retryCount: 0 },
      }),
    );
  const bestEffort = (
    operation: string,
    effect: Effect.Effect<void, unknown>,
  ) =>
    effect.pipe(
      Effect.catch((error) =>
        Effect.sync(() =>
          logger.warn("Event respawn side effect failed", { error, operation }),
        ),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.respawn", retryCount: 0 },
      }),
    );
  const invalidate = (guildId: string, eventId: string) =>
    Effect.forEach(
      [
        `event-read:v2:${guildId}:guild:*`,
        `event-read:v2:${guildId}:${eventId}:*`,
      ],
      (pattern) =>
        bestEffort(
          "events.respawn.cache",
          Effect.tryPromise({
            try: () => redis.deleteByPattern(pattern),
            catch: (error) => error,
          }),
        ),
      { concurrency: "unbounded", discard: true },
    );
  const publish = (routingKey: RoutingKey, payload: unknown) =>
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
    }).pipe(
      Effect.withSpan("events.respawn.cancelAutoClose", {
        attributes: { adapter: "events.bullmq", retryCount: 0 },
      }),
    );

  return {
    open: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      data: OpenRespawnWindowDto,
    ) =>
      Effect.gen(function* () {
        const heroRows = yield* query(
          "events.respawn.open.hero",
          database
            .select({ hero: eventHeroNpcTable, event: eventTable })
            .from(eventHeroNpcTable)
            .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
            .where(
              and(
                eq(eventHeroNpcTable.id, heroId),
                eq(eventTable.id, eventId),
                eq(eventTable.guildId, guild.id),
              ),
            )
            .limit(1),
        );
        const row = heroRows[0];
        if (!row)
          return yield* Effect.fail(new NotFoundException("Hero not found"));
        const memberRows = yield* query(
          "events.respawn.open.member",
          database
            .select({ id: memberTable.id })
            .from(memberTable)
            .where(eq(memberTable.guildId, guild.id))
            .limit(1),
        );
        const memberId = memberRows[0]?.id;
        if (memberId === undefined)
          return yield* Effect.fail(
            new BadRequestException("No members found in guild"),
          );
        const minSpawnTime = new Date(data.minSpawnTime);
        const maxSpawnTime = new Date(data.maxSpawnTime);
        const timer = yield* timers.openEventRespawnTimer({
          guildId: guild.id,
          world: row.event.world,
          npcId: row.hero.npcId ?? getSyntheticNpcId(heroId),
          npcName: row.hero.npcName,
          npcIcon: row.hero.npcIcon ?? null,
          minSpawnTime,
          maxSpawnTime,
          createdById: memberId,
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
                  .where(eq(eventMapTable.heroNpcId, heroId)),
              );
        const assignedMapIds = new Set(assignments.map(({ mapId }) => mapId));
        const windowOpenedAt = timer.windowOpenedAt ?? new Date();
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
                        id: randomUUID(),
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
            publish(RoutingKey.EVENT_RESPAWN_WINDOW_OPENED, {
              guildId: guild.id,
              eventId,
              heroId,
            }),
            Effect.forEach(
              maps,
              (map) =>
                publish(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
                  guildId: guild.id,
                  eventId,
                  mapId: map.id,
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
      data: CloseRespawnWindowDto,
    ) =>
      Effect.gen(function* () {
        const heroRows = yield* query(
          "events.respawn.close.hero",
          database
            .select({ hero: eventHeroNpcTable, event: eventTable })
            .from(eventHeroNpcTable)
            .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
            .where(
              and(
                eq(eventHeroNpcTable.id, heroId),
                eq(eventTable.id, eventId),
                eq(eventTable.guildId, guild.id),
              ),
            )
            .limit(1),
        );
        const row = heroRows[0];
        if (!row) {
          return yield* Effect.fail(new NotFoundException("Hero not found"));
        }
        const timerLookup = {
          guildId: guild.id,
          world: row.event.world,
          npcId: row.hero.npcId ?? getSyntheticNpcId(heroId),
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
            publish(RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED, {
              guildId: guild.id,
              eventId,
              heroId,
            }),
          ],
          { concurrency: "unbounded", discard: true },
        );
        if (data.createNewWindow) {
          if (!data.newMinSpawnTime || !data.newMaxSpawnTime) {
            return yield* Effect.fail(
              new BadRequestException(
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
            logger,
          ).open(guild, eventId, heroId, {
            minSpawnTime: data.newMinSpawnTime,
            maxSpawnTime: data.newMaxSpawnTime,
          } as OpenRespawnWindowDto);
        }
        return { success: true };
      }).pipe(Effect.withSpan("EventsMonitoringController_closeRespawnWindow")),
  };
};

export type EventRespawnCommands = ReturnType<typeof makeEventRespawnCommands>;
