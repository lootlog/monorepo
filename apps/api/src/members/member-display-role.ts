import { getMemberDisplayRole } from "@lootlog/domain/member-display-role";
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

/** Returns the member's Discord display role as a zero- or one-item list. */
export const topMemberDisplayRoles = (
  roles: MemberDisplayRole[],
  memberId: number,
) => {
  const displayRole = getMemberDisplayRole(
    roles.filter((role) => role.memberId === memberId),
  );

  return displayRole
    ? [{ position: displayRole.position, color: displayRole.color }]
    : [];
};
