import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import { buildLootVisibilityCacheScope } from "#src/loots/loot-visibility-cache";
import { roundEventDisplayValue } from "#src/events/round-event-display-value";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import type { Capability } from "@lootlog/schema/permissions";
import { stableJsonCacheKey } from "@lootlog/schema/stable-json";
import type {
  guildTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import type { LootNpcNameSummary } from "#src/loots/query/loot-query.operations";
import type { LootsOperations } from "#src/loots/loots.operations";
import { Clock, Effect } from "effect";
import type { RedisService } from "#src/redis/redis.service";
import { EventWrappedResponse } from "#src/contracts/events/schemas";
import {
  EVENT_WRAPPED_CACHE_TTL_SECONDS,
  getEventWrappedCacheKey,
} from "#src/shared/cache";
import type {
  EventWrappedHeroDto,
  EventWrappedLootHeroDto,
  EventWrappedResponseDto,
} from "#src/events/wrapped/event-wrapped.model";
import { selectEventWrappedLeader } from "#src/events/wrapped/select-event-wrapped-leader";
import type { EventWrappedStore } from "#src/events/wrapped/event-wrapped.repository";
import { summarizeSpawnWindowAssignments } from "#src/events/wrapped/event-wrapped.spawn-windows";
import {
  aggregateCoverage,
  aggregateHeroLoots,
  aggregateMembers,
  createEmptyRarityTotals,
} from "#src/events/wrapped/event-wrapped.aggregates";

type Guild = typeof guildTable.$inferSelect;

type Role = typeof roleTable.$inferSelect;

export const makeEventWrapped = (
  repository: EventWrappedStore,
  redis: Pick<RedisService, "getJson" | "setJson">,
  lootsService: Pick<LootsOperations, "summarizeLootsByNpcName">,
) => {
  const logContext = Effect.annotateLogs({ context: "EventWrapped" });

  function getWrapped(
    guild: Guild,
    eventId: string,
    permissions: Capability[],
    roles: Role[],
  ) {
    const cacheKey = getEventWrappedCacheKey(
      guild.id,
      eventId,
      stableJsonCacheKey(buildLootVisibilityCacheScope(permissions, roles)),
    );

    const load = getWrappedUncached(guild, eventId, permissions, roles);

    return Effect.gen(function* () {
      const cached = yield* redis
        .getJson(cacheKey, makeJsonCodec(EventWrappedResponse))
        .pipe(
          Effect.catch((error) =>
            Effect.logWarning("Event wrapped cache unavailable", error).pipe(
              logContext,
              Effect.as(null),
            ),
          ),
        );

      if (cached !== null) return cached;
      const response = yield* load;
      yield* redis
        .setJson(cacheKey, response, EVENT_WRAPPED_CACHE_TTL_SECONDS)
        .pipe(
          Effect.catch((error) =>
            Effect.logWarning("Event wrapped cache unavailable", error).pipe(
              logContext,
            ),
          ),
        );

      return response;
    }).pipe(Effect.withSpan("EventsCatalogController_showEventWrapped"));
  }

  function getWrappedUncached(
    guild: Guild,
    eventId: string,
    permissions: Capability[],
    roles: Role[],
  ) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(guild.id, eventId);

      if (!event) return yield* new ResourceNotFoundError("Event not found");

      const eventWindowStart = event.startsAt ?? event.createdAt;

      const eventWindowEnd =
        event.endsAt ?? new Date(yield* Clock.currentTimeMillis);

      const heroIds = event.heroNpcs.map((hero) => hero.id);

      const heroByName = new Map(
        event.heroNpcs.map((hero) => [hero.npcName.toLowerCase(), hero]),
      );

      const [rankings, kills, windowSummaries, assignments, lootSummary] =
        yield* Effect.all(
          [
            repository.findRankings(eventId),
            repository.findKills(heroIds),
            repository.findSummaries(heroIds),
            repository.findAssignments(heroIds),
            getEventLoots({
              guild,
              permissions,
              roles,
              world: event.world,
              heroNames: event.heroNpcs.map((hero) => hero.npcName),
              createdAtMin: eventWindowStart.toISOString(),
              createdAtMax: eventWindowEnd.toISOString(),
            }),
          ],
          { concurrency: "unbounded" },
        );

      const { avgMapsPerSpawnWindow, memberStats } =
        summarizeSpawnWindowAssignments(kills, assignments);

      const members = aggregateMembers(rankings, assignments, memberStats, {
        eventWindowStart,
        eventWindowEnd,
      });

      const heroLoots = aggregateHeroLoots(lootSummary.npcs, heroByName);
      const coverage = aggregateCoverage(windowSummaries, event.heroNpcs);

      const heroEntries: EventWrappedHeroDto[] = event.heroNpcs
        .map((hero) => {
          const heroRankings = rankings.filter(
            (ranking) => ranking.heroNpcName === hero.npcName,
          );

          const totalPoints = heroRankings.reduce(
            (sum, ranking) => sum + ranking.totalPoints,
            0,
          );

          const totalKills = heroRankings.reduce(
            (sum, ranking) => sum + ranking.totalKills,
            0,
          );

          const topHunter = selectEventWrappedLeader(
            heroRankings,
            (ranking) => ranking.totalKills,
          );

          return {
            heroNpcId: hero.id,
            npcId: hero.npcId,
            npcName: hero.npcName,
            npcIcon: hero.npcIcon,
            mapCount: hero.maps.length,
            totalKills,
            totalPoints: roundEventDisplayValue(totalPoints),
            coveragePercentage: roundEventDisplayValue(
              coverage.heroCoverageById.get(hero.id)?.coveragePercentage ?? 0,
            ),
            rarityTotals:
              heroLoots.get(hero.id)?.rarityTotals ?? createEmptyRarityTotals(),
            topHunter,
          };
        })
        .sort((left, right) => right.totalKills - left.totalKills);

      const killsByHour = new Map<number, number>();

      for (const kill of kills) {
        const hour = kill.killedAt.getHours();
        killsByHour.set(hour, (killsByHour.get(hour) ?? 0) + 1);
      }

      let busiestHour: number | null = null;
      let busiestHourKills = 0;

      for (const [hour, count] of killsByHour.entries()) {
        if (count > busiestHourKills) {
          busiestHour = hour;
          busiestHourKills = count;
        }
      }

      const totalPoints = Array.from(members.values()).reduce(
        (sum, member) => sum + member.totalPoints,
        0,
      );

      const totalTrackedSeconds = Array.from(members.values()).reduce(
        (sum, member) => sum + member.totalTimeSeconds,
        0,
      );

      const totalAfkSeconds = Array.from(members.values()).reduce(
        (sum, member) => sum + member.totalAfkSeconds,
        0,
      );

      const totalLoots = lootSummary.lootCount;

      const totalRarityTotals = Array.from(heroLoots.values()).reduce(
        (accumulator, aggregate) => {
          accumulator.unique += aggregate.rarityTotals.unique;
          accumulator.heroic += aggregate.rarityTotals.heroic;
          accumulator.legendary += aggregate.rarityTotals.legendary;

          return accumulator;
        },
        createEmptyRarityTotals(),
      );

      const memberList = Array.from(members.values());

      const response: EventWrappedResponseDto = {
        generatedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
        event: {
          id: event.id,
          name: event.name,
          world: event.world,
          startsAt: event.startsAt?.toISOString() ?? null,
          endsAt: event.endsAt?.toISOString() ?? null,
          heroCount: event.heroNpcs.length,
          mapCount: event.heroNpcs.reduce(
            (sum, hero) => sum + hero.maps.length,
            0,
          ),
          spawnCount: kills.length,
        },
        overview: {
          totalKills: kills.length,
          participantCount: memberList.length,
          totalPoints: roundEventDisplayValue(totalPoints),
          totalTrackedSeconds,
          totalAfkSeconds,
          coveragePercentage: roundEventDisplayValue(
            coverage.coveragePercentage,
          ),
          avgMapsPerSpawnWindow: roundEventDisplayValue(avgMapsPerSpawnWindow),
          busiestHour,
          busiestHourKills,
          totalLoots,
          rarityTotals: totalRarityTotals,
        },
        leaders: {
          topHunter: selectEventWrappedLeader(
            memberList,
            (member) => member.totalKills,
          ),
          topScorer: selectEventWrappedLeader(
            memberList,
            (member) => member.totalPoints,
          ),
          longestDuty: selectEventWrappedLeader(
            memberList,
            (member) => member.totalAssignedSeconds,
          ),
          topAfk: selectEventWrappedLeader(
            memberList,
            (member) => member.totalAfkSeconds,
          ),
          mostFlexible: selectEventWrappedLeader(
            memberList,
            (member) => member.maxMapsPerRespawn,
            (member) => member.avgMapsPerRespawn,
          ),
          topEfficiency: selectEventWrappedLeader(
            memberList.filter((member) => member.totalKills > 0),
            (member) => member.totalPoints / member.totalKills,
            (member) => member.totalKills,
          ),
        },
        coverage: {
          totalWindowCount: windowSummaries.length,
          totalWindowSeconds: coverage.totalWindowSeconds,
          totalCoverageSeconds: coverage.totalCoverageSeconds,
          totalUncoveredSeconds: coverage.totalUncoveredSeconds,
          totalUnassignedSeconds: coverage.totalUnassignedSeconds,
          coveragePercentage: roundEventDisplayValue(
            coverage.coveragePercentage,
          ),
          avgMapsPerSpawnWindow: roundEventDisplayValue(avgMapsPerSpawnWindow),
          bestHeroCoverage: coverage.bestHeroCoverage,
          roughestHeroCoverage: coverage.roughestHeroCoverage,
        },
        heroes: heroEntries,
        loot: {
          totalLoots,
          rarityTotals: totalRarityTotals,
          heroBreakdown: event.heroNpcs
            .map((hero): EventWrappedLootHeroDto => ({
              heroNpcId: hero.id,
              npcName: hero.npcName,
              npcIcon: hero.npcIcon,
              totalLoots: heroLoots.get(hero.id)?.totalLoots ?? 0,
              rarityTotals:
                heroLoots.get(hero.id)?.rarityTotals ??
                createEmptyRarityTotals(),
            }))
            .sort((left, right) => right.totalLoots - left.totalLoots),
        },
      };

      return response;
    });
  }

  function getEventLoots(params: {
    guild: Guild;
    permissions: Capability[];
    roles: Role[];
    world: string;
    heroNames: string[];
    createdAtMin: string;
    createdAtMax: string;
  }) {
    if (params.heroNames.length === 0) {
      return Effect.succeed<LootNpcNameSummary>({ lootCount: 0, npcs: [] });
    }

    return lootsService.summarizeLootsByNpcName(
      params.guild,
      createAccessPolicy({ capabilities: params.permissions }),
      params.roles,
      {
        npcs: params.heroNames,
        world: params.world,
        createdAtMin: params.createdAtMin,
        createdAtMax: params.createdAtMax,
      },
    );
  }

  return { getWrapped };
};

export type EventWrapped = ReturnType<typeof makeEventWrapped>;
