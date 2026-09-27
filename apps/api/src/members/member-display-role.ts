import { desc, eq, inArray } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { memberToRoleTable, roleTable } from "#src/database/drizzle/schema";

export const memberDisplayRolesQuery = (
  database: ApiDatabaseValue,
  memberIds: number[],
) =>
  database
    .select({
      memberId: memberToRoleTable.A,
      position: roleTable.position,
      color: roleTable.color,
    })
    .from(memberToRoleTable)
    .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
    .where(inArray(memberToRoleTable.A, memberIds))
    .orderBy(desc(roleTable.position));

type MemberDisplayRole = Pick<
  typeof roleTable.$inferSelect,
  "position" | "color"
> & { memberId: number };

/** Input is ordered by descending role position by the persistence query. */
export const topMemberDisplayRoles = (
  roles: MemberDisplayRole[],
  memberId: number,
) =>
  roles
    .filter((role) => role.memberId === memberId)
    .slice(0, 1)
    .map(({ position, color }) => ({ position, color }));
