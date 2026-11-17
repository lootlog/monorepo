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

/**
 * A Discord role colour as six lowercase hex digits without `#`, or `null`
 * for 0, which Discord uses for a role without a colour.
 */
export const discordRoleColorHex = (
  color: number | null | undefined,
): string | null => (color ? color.toString(16).padStart(6, "0") : null);

/** A Discord role colour as a CSS colour, or `null` without one. */
export const discordRoleCssColor = (
  color: number | null | undefined,
): string | null => {
  const hex = discordRoleColorHex(color);

  return hex ? `#${hex}` : null;
};
