import {
  adapterOperation,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import { eventMapScope } from "#src/events/event-scope-query";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { eventReadCacheEntry } from "#src/events/catalog/event-read-cache.service";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventTable,
} from "#src/database/drizzle/event.schema";
import { makeTypeJsonCodec, type RedisService } from "#src/redis/redis.service";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import {
  CoverageGapResponse,
  HeroCoverageGapResponse,
  NullableCoverageGapResponse,
} from "#src/events/monitoring/event-monitoring-response.schema";

export const makeEventGapReads = (
  database: typeof ApiDatabase.Service,
  redis: Pick<RedisService, "getOrSetJson">,
) => {
  const query = adapterOperation("events.gaps.drizzle");

  const cached = <
    S extends Schema.ConstraintDecoder<unknown>,
    Params extends object,
  >(
    guildId: string,
    eventId: string,
    scope: string,
    params: Params,
    schema: S,
    load: Effect.Effect<S["Type"], unknown>,
  ) => {
    const codec = makeTypeJsonCodec(schema);

    return redis
      .getOrSetJson({
        ...eventReadCacheEntry(guildId, eventId, scope, params),
        codec,
        ttlSeconds: 10,
        factory: load,
        onError: (error) =>
          Effect.logWarning("Event gap cache unavailable", error),
      })
      .pipe(withAdapterSpan("events.gaps.cache", "events.redis"));
  };

  const requireMap = (guildId: string, eventId: string, mapId: string) =>
    query(
      "events.gaps.scopedMap",
      database
        .select({ id: eventMapTable.id })
        .from(eventMapTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(eventMapScope(guildId, eventId, mapId))
        .limit(1),
    ).pipe(
      Effect.flatMap((rows) =>
        rows[0]
          ? Effect.void
          : Effect.fail(new ResourceNotFoundError("Map not found")),
      ),
    );

  return {
    getMapCoverageGaps: (
      guild: { id: string },
      eventId: string,
      mapId: string,
    ) =>
      cached(
        guild.id,
        eventId,
        "map-gaps",
        { mapId },
        Schema.Array(CoverageGapResponse),
        Effect.gen(function* () {
          yield* requireMap(guild.id, eventId, mapId);

          return yield* query(
            "events.gaps.mapHistory",
            database
              .select()
              .from(eventMapCoverageGapTable)
              .where(eq(eventMapCoverageGapTable.mapId, mapId))
              .orderBy(desc(eventMapCoverageGapTable.startedAt)),
          );
        }),
      ).pipe(Effect.withSpan("EventsMonitoringController_getMapCoverageGaps")),

    getActiveGapForMap: (
      guild: { id: string },
      eventId: string,
      mapId: string,
    ) =>
      cached(
        guild.id,
        eventId,
        "map-active-gap",
        { mapId },
        NullableCoverageGapResponse,
        Effect.gen(function* () {
          yield* requireMap(guild.id, eventId, mapId);

          const rows = yield* query(
            "events.gaps.mapActive",
            database
              .select()
              .from(eventMapCoverageGapTable)
              .where(
                and(
                  eq(eventMapCoverageGapTable.mapId, mapId),
                  isNull(eventMapCoverageGapTable.endedAt),
                ),
              )
              .limit(1),
          );

          return rows[0] ?? null;
        }),
      ).pipe(Effect.withSpan("EventsMonitoringController_getActiveGapForMap")),

    getHeroCoverageGaps: (
      guild: { id: string },
      eventId: string,
      heroId: string,
    ) =>
      cached(
        guild.id,
        eventId,
        "hero-gaps",
        { heroNpcId: heroId },
        Schema.Array(HeroCoverageGapResponse),
        query(
          "events.gaps.heroHistory",
          database
            .select({
              gap: eventMapCoverageGapTable,
              mapName: eventMapTable.mapName,
              mapNumericId: eventMapTable.mapId,
            })
            .from(eventMapCoverageGapTable)
            .innerJoin(
              eventMapTable,
              eq(eventMapTable.id, eventMapCoverageGapTable.mapId),
            )
            .where(eq(eventMapCoverageGapTable.heroNpcId, heroId))
            .orderBy(desc(eventMapCoverageGapTable.startedAt)),
        ).pipe(
          Effect.map((rows) =>
            rows.map(({ gap, mapName, mapNumericId }) => ({
              ...gap,
              map: { mapName, mapId: mapNumericId },
            })),
          ),
        ),
      ).pipe(Effect.withSpan("EventsMonitoringController_getHeroCoverageGaps")),

    getActiveGapsForHero: (
      guild: { id: string },
      eventId: string,
      heroId: string,
    ) =>
      cached(
        guild.id,
        eventId,
        "hero-active-gaps",
        { heroNpcId: heroId },
        Schema.Array(CoverageGapResponse),
        query(
          "events.gaps.heroActive",
          database
            .select()
            .from(eventMapCoverageGapTable)
            .where(
              and(
                eq(eventMapCoverageGapTable.heroNpcId, heroId),
                isNull(eventMapCoverageGapTable.endedAt),
              ),
            ),
        ),
      ).pipe(
        Effect.withSpan("EventsMonitoringController_getActiveGapsForHero"),
      ),
  };
};

export type EventGapReads = ReturnType<typeof makeEventGapReads>;
