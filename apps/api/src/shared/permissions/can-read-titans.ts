import { Permission } from "src/generated/prisma/client";

export function canReadTitans(permissions: Permission[], admin: boolean) {
  return admin || permissions.includes(Permission.LOOTLOG_LOOTS_TITANS_READ);
}
