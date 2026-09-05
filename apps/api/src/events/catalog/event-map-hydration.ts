import { topMemberDisplayRoles } from "#src/members/member-display-role";
import { desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventMapTable,
  eventMapToMemberTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

export const makeEventMapHydration = <Failure>(
  database: typeof ApiDatabase.Service,
  query: <A, E>(
    operation: string,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, Failure>,
) => {
  return Effect.fnUntraced(function* (
    maps: Array<typeof eventMapTable.$inferSelect>,
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
        ),
    );
    const memberIds = [...new Set(assignments.map(({ member }) => member.id))];
    const roles =
      memberIds.length === 0
        ? []
        : yield* query(
            "events.catalog.memberRoles",
            database
              .select({
                memberId: memberToRoleTable.A,
                position: roleTable.position,
                color: roleTable.color,
              })
              .from(memberToRoleTable)
              .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
              .where(inArray(memberToRoleTable.A, memberIds))
              .orderBy(desc(roleTable.position)),
          );
    return maps.map((map) => ({
      ...map,
      assignedMembers: assignments
        .filter(({ mapId }) => mapId === map.id)
        .map(({ member }) => ({
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          userId: member.userId,
          roles: topMemberDisplayRoles(roles, member.id),
        })),
    }));
  });
};
