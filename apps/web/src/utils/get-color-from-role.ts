const DEFAULT_ROLE_COLOR_HEX = "FFF";

type RoleColorSource = {
  color?: number | null;
};

const hasCustomRoleColor = (
  color: number | null | undefined,
): color is number => color !== null && color !== undefined && color !== 0;

export const getColorFromRoleColor = (color: number | null | undefined) => {
  if (!hasCustomRoleColor(color)) {
    return DEFAULT_ROLE_COLOR_HEX;
  }

  return color.toString(16).padStart(6, "0");
};

export const getCustomRoleCssColor = (
  color: number | null | undefined,
): string | null => {
  if (!hasCustomRoleColor(color)) {
    return null;
  }

  return `#${getColorFromRoleColor(color).toUpperCase()}`;
};

export const getColorFromRole = (
  roles: readonly RoleColorSource[] | null | undefined,
) => {
  return getColorFromRoleColor(roles?.[0]?.color);
};
