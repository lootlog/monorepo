import { Permission } from 'src/guilds/enum/permission.type';
import { GuildRole } from 'src/guilds/types/guild.types';

export const isAdministrativeUser = (permissions: Permission[]) => {
  return (
    permissions.includes(Permission.ADMIN) ||
    permissions.includes(Permission.LOOTLOG_MANAGE) ||
    permissions.includes(Permission.OWNER)
  );
};

export const isAdministrativeUserFromRoles = (roles: GuildRole[]) => {
  const allPermissions = roles.flatMap((role) => role.permissions);
  return isAdministrativeUser(allPermissions);
};
