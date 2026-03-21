import { Permission } from "prisma/generated/client";

export function canReadHeroes(permissions: Permission[], admin: boolean) {
  return admin || permissions.includes(Permission.LOOTLOG_LOOTS_HEROES_READ);
}
