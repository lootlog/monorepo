import {
  memberDisplayRolesQuery,
  topMemberDisplayRoles,
} from "#src/members/member-display-role";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { groupBy } from "es-toolkit";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventMapLocationTable,
  eventMapTable,
  eventMapToMemberTable,
  memberTable,
} from "#src/database/drizzle/schema";

type EventMapRow = typeof eventMapTable.$inferSelect;

type EventMapLocationRow = typeof eventMapLocationTable.$inferSelect;

/**
 * Reads event maps with their assigned members. Every read takes a fixed
 * number of statements regardless of how many heroes, locations, or maps
 * it covers.
 */
export const makeEventMapHydration = <Failure>(
  database: typeof ApiDatabase.Service,
  query: <A, E>(
    operation: string,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, Failure>,
) => {
  const hydrateMaps = Effect.fnUntraced(function* (
    maps: ReadonlyArray<EventMapRow>,
  ) {
    if (maps.length === 0) return [];

    const assignments = yield* query(
      "events.catalog.mapAssignments",
      database
        .select({ mapId: eventMapToMemberTable.A, member: memberTable })
        .from(eventMapToMemberTable)
        .innerJoin(memberTable, eq(memberTable.id, eventMapToMemberTable.B))
        .where(
          inArray(
            eventMapToMemberTable.A,
            maps.map(({ id }) => id),
          ),
        )
        // Primary-key order keeps each map's members stable however many
        // maps one read covers.
        .orderBy(asc(eventMapToMemberTable.A), asc(eventMapToMemberTable.B)),
    );

    const memberIds = [...new Set(assignments.map(({ member }) => member.id))];

    const roles =
      memberIds.length === 0
        ? []
        : yield* query(
            "events.catalog.memberRoles",
            memberDisplayRolesQuery(database, memberIds),
          );

    const assignmentsByMap = groupBy(assignments, ({ mapId }) => mapId);

    return maps.map((map) => ({
      ...map,
      assignedMembers: (assignmentsByMap[map.id] ?? []).map(({ member }) => ({
        id: member.id,
        name: member.name,
        avatar: member.avatar,
        userId: member.userId,
        roles: topMemberDisplayRoles(roles, member.id),
      })),
    }));
  });

  /** Hydrated maps of the heroes, optionally only those in one location. */
  const heroMaps = (heroIds: ReadonlyArray<string>, locationId?: string) =>
    heroIds.length === 0
      ? Effect.succeed([])
      : query(
          "events.catalog.maps",
          database
            .select()
            .from(eventMapTable)
            .where(
              and(
                inArray(eventMapTable.heroNpcId, heroIds),
                locationId
                  ? eq(eventMapTable.locationId, locationId)
                  : undefined,
              ),
            )
            .orderBy(asc(eventMapTable.mapId)),
        ).pipe(Effect.flatMap(hydrateMaps));

  /**
   * Each hero's ordered locations with their maps, and the maps outside any
   * location. Every map is hydrated once.
   */
  const heroMapLayouts = (heroIds: ReadonlyArray<string>) =>
    Effect.all(
      {
        locations:
          heroIds.length === 0
            ? Effect.succeed<EventMapLocationRow[]>([])
            : query(
                "events.catalog.locations",
                database
                  .select()
                  .from(eventMapLocationTable)
                  .where(inArray(eventMapLocationTable.heroNpcId, heroIds))
                  .orderBy(asc(eventMapLocationTable.order)),
              ),
        maps: heroMaps(heroIds),
      },
      { concurrency: "unbounded" },
    ).pipe(
      Effect.map(({ locations, maps }) => {
        const locationsByHero = groupBy(
          locations,
          ({ heroNpcId }) => heroNpcId,
        );

        const mapsByHero = groupBy(maps, ({ heroNpcId }) => heroNpcId);

        return (heroId: string) => {
          const ownMaps = mapsByHero[heroId] ?? [];

          return {
            locations: (locationsByHero[heroId] ?? []).map((location) => ({
              ...location,
              maps: ownMaps.filter(
                ({ locationId }) => locationId === location.id,
              ),
            })),
            maps: ownMaps.filter(({ locationId }) => locationId === null),
          };
        };
      }),
    );

  return { hydrateMaps, heroMaps, heroMapLayouts };
};
