const ADMIN_PANEL_ALLOWED_ROLES = new Set(["admin", "moderator", "developer"]);

const normalizeRoles = (roleHeader: string | null): string[] => {
  if (!roleHeader) {
    return [];
  }

  return roleHeader
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter((role) => role.length > 0);
};

export const hasAdminPanelAccessByRoleHeader = (
  roleHeader: string | null,
): boolean => {
  const roles = normalizeRoles(roleHeader);
  return roles.some((role) => ADMIN_PANEL_ALLOWED_ROLES.has(role));
};
