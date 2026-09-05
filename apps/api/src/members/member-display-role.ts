import type { roleTable } from "#src/database/drizzle/schema";

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
