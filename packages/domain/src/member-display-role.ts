import { maxBy } from "es-toolkit";

type DisplayRoleCandidate = {
  readonly color?: number | null;
  readonly position?: number | null;
};

export const getMemberDisplayRole = <Role extends DisplayRoleCandidate>(
  roles: readonly Role[] | null | undefined,
): Role | undefined =>
  maxBy(
    (roles ?? []).filter((role) => Boolean(role.color)),
    (role) => role.position ?? 0,
  );

export const discordRoleColorHex = (
  color: number | null | undefined,
): string | null => (color ? color.toString(16).padStart(6, "0") : null);

export const discordRoleCssColor = (
  color: number | null | undefined,
): string | null => {
  const hex = discordRoleColorHex(color);

  return hex ? `#${hex}` : null;
};
