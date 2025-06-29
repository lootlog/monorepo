import { Permission } from 'src/guilds/enum/permission.type';

export const isAdministrativeUser = (permissions: Permission[]) => {
  return (
    permissions.includes(Permission.ADMIN) ||
    permissions.includes(Permission.LOOTLOG_MANAGE) ||
    permissions.includes(Permission.OWNER)
  );
};
