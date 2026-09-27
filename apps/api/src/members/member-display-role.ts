import { getMemberDisplayRole } from "@lootlog/domain/member-display-role";
import type { roleTable } from "#src/database/drizzle/schema";

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
