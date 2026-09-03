import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import superjson from "superjson";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventTable,
  npcKillStatsTable,
} from "#src/database/drizzle/schema";
import { makeJsonCodec, type RedisService } from "#src/redis/redis.service";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/application-logger";
import type { EventTimersPort } from "#src/events/respawn/event-timers.port";
import { EventHeroStatsResponse } from "#src/events/kills/event-kill-response.schema";

export class EventHeroSummaryError extends TaggedErrorClass<EventHeroSummaryError>()(
  "EventHeroSummaryError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventHeroSummary = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  timers: EventTimersPort,
  logger: Logger,
) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new EventHeroSummaryError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.hero-summary.drizzle", retryCount: 0 },
      }),
    );
  const eventWithHeroes = (guildId: string, eventId: string) =>
    Effect.gen(function* () {
      const events = yield* query(
        "events.heroSummary.event",
        database
          .select()
          .from(eventTable)
          .where(
            and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)),
          )
          .limit(1),
      );
      const event = events[0];
      if (!event)
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      const heroNpcs = yield* query(
        "events.heroSummary.heroes",
        database
          .select()
          .from(eventHeroNpcTable)
          .where(eq(eventHeroNpcTable.eventId, eventId)),
      );
      return { event, heroNpcs };
    });
  const cachedStats = <S extends Schema.ConstraintDecoder<unknown>>(
    guildId: string,
    eventId: string,
    schema: S,
    load: Effect.Effect<S["Type"], unknown>,
  ) => {
    const key = `event-read:v2:${guildId}:${eventId}:hero-stats-v2:e30`;
    const codec = makeJsonCodec(Schema.toType(schema), {
      stringify: (value: unknown) => superjson.stringify(value),
      parse: (text): unknown => superjson.parse(text),
    });
    return Effect.gen(function* () {
      const hit = yield* Effect.tryPromise({
        try: () => redis.getJson(key, codec),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            logger.warn("Event hero stats cache unavailable", error);
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
          Effect.sync(() =>
            logger.warn("Event hero stats cache unavailable", error),
          ),
        ),
      );
      return value;
    }).pipe(
      Effect.withSpan("events.heroSummary.cache", {
        attributes: { adapter: "events.redis", retryCount: 0 },
      }),
    );
  };
  return {
    getTimers: (guild: { id: string }, eventId: string, world: string) =>
      Effect.gen(function* () {
        const { heroNpcs } = yield* eventWithHeroes(guild.id, eventId);
        if (heroNpcs.length === 0) return [];
        const values = yield* timers.getTimersForEventHeroFilters(
          guild.id,
          world,
          heroNpcs,
        );
        return values.map((timer) => {
          const npc =
            timer.npc && typeof timer.npc === "object"
              ? (timer.npc as { name?: unknown; icon?: unknown })
              : {};
          return {
            npcId: timer.npcId,
            world: timer.world,
            minSpawnTime: timer.minSpawnTime,
            maxSpawnTime: timer.maxSpawnTime,
            npc: {
              name: typeof npc.name === "string" ? npc.name : "",
              icon: typeof npc.icon === "string" ? npc.icon : null,
            },
          };
        });
      }).pipe(Effect.withSpan("EventsRankingController_getEventHeroTimers")),

    getStats: (guild: { id: string }, eventId: string) =>
      cachedStats(
        guild.id,
        eventId,
        Schema.Array(EventHeroStatsResponse),
        Effect.gen(function* () {
          const { event, heroNpcs } = yield* eventWithHeroes(guild.id, eventId);
          const heroIds = heroNpcs.map(({ id }) => id);
          const counts =
            heroIds.length === 0
              ? []
              : yield* query(
                  "events.heroSummary.killCounts",
                  database
                    .select({
                      heroNpcId: eventHeroKillTable.heroNpcId,
                      count: sql<number>`count(*)`,
                    })
                    .from(eventHeroKillTable)
                    .where(inArray(eventHeroKillTable.heroNpcId, heroIds))
                    .groupBy(eventHeroKillTable.heroNpcId),
                );
          const npcIds = heroNpcs.flatMap(({ npcId }) =>
            npcId === null ? [] : [npcId],
          );
          const npcStats =
            npcIds.length === 0
              ? []
              : yield* query(
                  "events.heroSummary.npcStats",
                  database
                    .selectDistinctOn([npcKillStatsTable.npcId], {
                      npcId: npcKillStatsTable.npcId,
                      npcProf: npcKillStatsTable.npcProf,
                    })
                    .from(npcKillStatsTable)
                    .where(
                      and(
                        eq(npcKillStatsTable.guildId, guild.id),
                        eq(npcKillStatsTable.world, event.world),
                        inArray(npcKillStatsTable.npcId, npcIds),
                        isNotNull(npcKillStatsTable.npcProf),
                      ),
                    )
                    .orderBy(
                      npcKillStatsTable.npcId,
                      desc(npcKillStatsTable.updatedAt),
                    ),
                );
          const professions = new Map(
            npcStats.map(({ npcId, npcProf }) => [npcId, npcProf]),
          );
          return heroNpcs.map((hero) => ({
            heroId: hero.id,
            npcId: hero.npcId,
            npcName: hero.npcName,
            npcLvl: hero.npcLvl,
            npcProf:
              hero.npcId === null
                ? null
                : (professions.get(hero.npcId) ?? null),
            killCount: Number(
              counts.find(({ heroNpcId }) => heroNpcId === hero.id)?.count ?? 0,
            ),
          }));
        }),
      ).pipe(Effect.withSpan("EventsRankingController_getEventHeroStats")),
  };
};

export type EventHeroSummary = ReturnType<typeof makeEventHeroSummary>;
