import { Permission } from 'generated/client';

export function canReadHeroes(permissions: Permission[], admin: boolean) {
  return admin || permissions.includes(Permission.LOOTLOG_READ_LOOTS_HEROES);
}
