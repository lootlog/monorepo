import { and, asc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventRankingTable,
  eventRespawnWindowSummaryTable,
  eventTable,
  memberTable,
} from "#src/database/drizzle/schema";

export const makeEventWrappedStore = (
  database: typeof ApiDatabase.Service,
) => ({
  findEvent(guildId: string, eventId: string) {
    return Effect.gen(function* () {
      const events = yield* database
        .select({
          id: eventTable.id,
          name: eventTable.name,
          world: eventTable.world,
          startsAt: eventTable.startsAt,
          endsAt: eventTable.endsAt,
          createdAt: eventTable.createdAt,
        })
        .from(eventTable)
        .where(and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)))
        .limit(1);
      const event = events[0];
      if (!event) return null;
      const [heroes, maps] = yield* Effect.all(
        [
          database
            .select({
              id: eventHeroNpcTable.id,
              npcId: eventHeroNpcTable.npcId,
              npcName: eventHeroNpcTable.npcName,
              npcIcon: eventHeroNpcTable.npcIcon,
            })
            .from(eventHeroNpcTable)
            .where(eq(eventHeroNpcTable.eventId, eventId)),
          database
            .select({
              id: eventMapTable.id,
              heroNpcId: eventMapTable.heroNpcId,
            })
            .from(eventMapTable)
            .innerJoin(
              eventHeroNpcTable,
              eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
            )
            .where(eq(eventHeroNpcTable.eventId, eventId)),
        ],
        { concurrency: "unbounded" },
      );
      return {
        ...event,
        heroNpcs: heroes.map((hero) => ({
          ...hero,
          maps: maps.filter(({ heroNpcId }) => heroNpcId === hero.id),
        })),
      };
    });
  },

  findRankings(eventId: string) {
    return database
      .select({ ranking: eventRankingTable, member: memberTable })
      .from(eventRankingTable)
      .innerJoin(memberTable, eq(memberTable.id, eventRankingTable.memberId))
      .where(eq(eventRankingTable.eventId, eventId))
      .pipe(
        Effect.map((rows) =>
          rows.map(({ ranking, member }) => ({ ...ranking, member })),
        ),
      );
  },

  findKills(heroIds: string[]) {
    if (heroIds.length === 0) return Effect.succeed([]);
    return database
      .select({
        id: eventHeroKillTable.id,
        heroNpcId: eventHeroKillTable.heroNpcId,
        killedAt: eventHeroKillTable.killedAt,
        minSpawnTimeAtKill: eventHeroKillTable.minSpawnTimeAtKill,
      })
      .from(eventHeroKillTable)
      .where(inArray(eventHeroKillTable.heroNpcId, heroIds))
      .orderBy(asc(eventHeroKillTable.killedAt));
  },

  findSummaries(heroIds: string[]) {
    if (heroIds.length === 0) return Effect.succeed([]);
    return database
      .select({
        heroNpcId: eventRespawnWindowSummaryTable.heroNpcId,
        totalWindowSeconds: eventRespawnWindowSummaryTable.totalWindowSeconds,
        totalCoverageSeconds:
          eventRespawnWindowSummaryTable.totalCoverageSeconds,
        totalUncoveredSeconds:
          eventRespawnWindowSummaryTable.totalUncoveredSeconds,
        totalUnassignedSeconds:
          eventRespawnWindowSummaryTable.totalUnassignedSeconds,
        mapStats: eventRespawnWindowSummaryTable.mapStats,
      })
      .from(eventRespawnWindowSummaryTable)
      .where(inArray(eventRespawnWindowSummaryTable.heroNpcId, heroIds));
  },

  findAssignments(heroIds: string[]) {
    if (heroIds.length === 0) return Effect.succeed([]);
    return database
      .select({
        assignment: eventMapAssignmentHistoryTable,
        member: memberTable,
      })
      .from(eventMapAssignmentHistoryTable)
      .innerJoin(
        memberTable,
        eq(memberTable.id, eventMapAssignmentHistoryTable.memberId),
      )
      .where(inArray(eventMapAssignmentHistoryTable.heroNpcId, heroIds))
      .pipe(
        Effect.map((rows) =>
          rows.map(({ assignment, member }) => ({ ...assignment, member })),
        ),
      );
  },
});

export type EventWrappedStore = ReturnType<typeof makeEventWrappedStore>;
