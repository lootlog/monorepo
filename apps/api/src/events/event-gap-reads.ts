import { and, desc, eq, isNull } from "drizzle-orm";
import { Effect, Schema } from "effect";
import superjson from "superjson";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventTable,
} from "#src/database/drizzle/schema";
import type { RedisService } from "#src/redis/redis.service";
import { NotFoundException } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventGapReadError extends Schema.TaggedError<EventGapReadError>()(
  "EventGapReadError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const makeEventGapReads = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  logger: Logger,
) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new EventGapReadError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.gaps.drizzle", retryCount: 0 },
      }),
    );
  const cached = <A>(
    guildId: string,
    eventId: string,
    scope: string,
    params: Record<string, unknown>,
    load: Effect.Effect<A, unknown>,
  ) => {
    const key = [
      "event-read:v2",
      guildId,
      eventId,
      scope,
      Buffer.from(stableSerialize(params)).toString("base64url"),
    ].join(":");
    const codec = {
      stringify: (value: unknown) => superjson.stringify(value),
      parse: <T>(text: string) => superjson.parse<T>(text),
    };
    return Effect.gen(function* () {
      const hit = yield* Effect.tryPromise({
        try: () => redis.getJson<A>(key, codec),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            logger.warn("Event gap cache unavailable", error);
            return null;
          }),
        ),
      );
      if (hit !== null) return hit;
      const value = yield* load;
      yield* Effect.tryPromise({
        try: () => redis.setJson(key, value, 10, codec),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => logger.warn("Event gap cache unavailable", error)),
        ),
      );
      return value;
    }).pipe(
      Effect.withSpan("events.gaps.cache", {
        attributes: { adapter: "events.redis", retryCount: 0 },
      }),
    );
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
        .where(
          and(
            eq(eventMapTable.id, mapId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    ).pipe(
      Effect.flatMap((rows) =>
        rows[0]
          ? Effect.void
          : Effect.fail(new NotFoundException("Map not found")),
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
