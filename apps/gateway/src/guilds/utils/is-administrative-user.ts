import { Permission } from "@lootlog/types";
import type { GuildRole } from "src/guilds/types/guild.types";

const ADMINISTRATIVE_PERMISSIONS = [
  Permission.ADMIN,
  Permission.OWNER,
] as const;

const hasAnyPermission = (
  permissions: Permission[],
  requiredPermissions: readonly Permission[],
) => {
  return requiredPermissions.some((permission) =>
    permissions.includes(permission),
  );
};

const hasAnyRolePermission = (
  roles: GuildRole[],
  requiredPermissions: readonly Permission[],
) => {
  return roles.some((role) =>
    hasAnyPermission(role.permissions, requiredPermissions),
  );
};

export const isAdministrativeUser = (permissions: Permission[]) => {
  return hasAnyPermission(permissions, ADMINISTRATIVE_PERMISSIONS);
};

export const isAdministrativeUserFromRoles = (roles: GuildRole[]) => {
  return hasAnyRolePermission(roles, ADMINISTRATIVE_PERMISSIONS);
};
