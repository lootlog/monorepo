import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
} from "#src/database/drizzle/schema";

export const makeEventCoordinationStore = (
  database: typeof ApiDatabase.Service,
) => ({
  findEvent(guildId: string, eventId: string) {
    return Effect.gen(function* () {
      const events = yield* database
        .select({
          id: eventTable.id,
          world: eventTable.world,
          assignmentTimeoutMinutes: eventTable.assignmentTimeoutMinutes,
        })
        .from(eventTable)
        .where(and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)))
        .limit(1);
      const event = events[0];
      if (!event) return null;
      const [heroes, maps, assignments] = yield* Effect.all(
        [
          database
            .select()
            .from(eventHeroNpcTable)
            .where(eq(eventHeroNpcTable.eventId, eventId)),
          database
            .select({ map: eventMapTable })
            .from(eventMapTable)
            .innerJoin(
              eventHeroNpcTable,
              eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
            )
            .where(eq(eventHeroNpcTable.eventId, eventId))
            .orderBy(asc(eventMapTable.mapId)),
          database
            .select({
              mapId: eventMapToMemberTable.A,
              memberId: eventMapToMemberTable.B,
            })
            .from(eventMapToMemberTable)
            .innerJoin(
              eventMapTable,
              eq(eventMapTable.id, eventMapToMemberTable.A),
            )
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
          id: hero.id,
          npcId: hero.npcId,
          npcName: hero.npcName,
          npcIcon: hero.npcIcon,
          npcLvl: hero.npcLvl,
          maps: maps
            .filter(({ map }) => map.heroNpcId === hero.id)
            .map(({ map }) => ({
              id: map.id,
              mapId: map.mapId,
              mapName: map.mapName,
              assignedMembers: assignments
                .filter(({ mapId }) => mapId === map.id)
                .map(({ memberId }) => ({ id: memberId })),
            })),
        })),
      };
    });
  },

  findActiveGaps(heroIds: string[]) {
    if (heroIds.length === 0) {
      return Effect.succeed(
        [] as Array<
          typeof eventMapCoverageGapTable.$inferSelect & {
            map: { mapId: number; mapName: string };
          }
        >,
      );
    }
    return Effect.map(
      database
        .select({ gap: eventMapCoverageGapTable, map: eventMapTable })
        .from(eventMapCoverageGapTable)
        .innerJoin(
          eventMapTable,
          eq(eventMapTable.id, eventMapCoverageGapTable.mapId),
        )
        .where(
          and(
            inArray(eventMapCoverageGapTable.heroNpcId, heroIds),
            isNull(eventMapCoverageGapTable.endedAt),
          ),
        ),
      (rows) =>
        rows.map(({ gap, map }) => ({
          ...gap,
          map: { mapId: map.mapId, mapName: map.mapName },
        })),
    );
  },
});

export type EventCoordinationStore = ReturnType<
  typeof makeEventCoordinationStore
>;
