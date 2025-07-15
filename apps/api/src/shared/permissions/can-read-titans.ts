import { Permission } from 'generated/client';

export function canReadTitans(permissions: Permission[], admin: boolean) {
  return admin || permissions.includes(Permission.LOOTLOG_READ_LOOTS_TITANS);
}
