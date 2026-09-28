import { maxBy } from "es-toolkit";

type DisplayRoleCandidate = {
  readonly color?: number | null;
  readonly position?: number | null;
};

/**
 * Discord paints a member's name with the highest-positioned role that has a
 * color; a role without one (color 0) does not count, even when it is the
 * member's highest role. Without positions, the first colored role wins.
 */
export const getMemberDisplayRole = <Role extends DisplayRoleCandidate>(
  roles: readonly Role[] | null | undefined,
): Role | undefined =>
  maxBy(
    (roles ?? []).filter((role) => Boolean(role.color)),
    (role) => role.position ?? 0,
  );
