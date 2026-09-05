import { desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { memberToRoleTable, roleTable } from "#src/database/drizzle/schema";

export const hydrateMemberRoles = Effect.fnUntraced(function* <
  Member extends { id: number },
>(database: typeof ApiDatabase.Service, members: Member[]) {
  if (members.length === 0) return [];
  const roles = yield* database
    .select({ memberId: memberToRoleTable.A, role: roleTable })
    .from(memberToRoleTable)
    .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
    .where(
      inArray(
        memberToRoleTable.A,
        members.map(({ id }) => id),
      ),
    )
    .orderBy(desc(roleTable.position));
  return members.map((member) => ({
    ...member,
    roles: roles
      .filter(({ memberId }) => memberId === member.id)
      .map(({ role }) => role),
  }));
});
