import { Permission } from "@lootlog/types";
import type { GuildRole } from "src/guilds/types/guild.types";

const ADMINISTRATIVE_PERMISSIONS = [
  Permission.ADMIN,
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
] as const;

const OWNER_OR_ADMIN_PERMISSIONS = [
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

const getRolePermissions = (roles: GuildRole[]) => {
  return roles.flatMap((role) => role.permissions);
};

export const isAdministrativeUser = (permissions: Permission[]) => {
  return hasAnyPermission(permissions, ADMINISTRATIVE_PERMISSIONS);
};

export const isAdministrativeUserFromRoles = (roles: GuildRole[]) => {
  return isAdministrativeUser(getRolePermissions(roles));
};

export const isOwnerOrAdmin = (permissions: Permission[]) => {
  return hasAnyPermission(permissions, OWNER_OR_ADMIN_PERMISSIONS);
};

export const isOwnerOrAdminFromRoles = (roles: GuildRole[]) => {
  return isOwnerOrAdmin(getRolePermissions(roles));
};
