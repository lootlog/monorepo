import { Permission } from "prisma/generated/client";

export const ELIGIBLE_HERO_READ_ACL = [
  Permission.LOOTLOG_TIMERS_HEROES_READ,
  Permission.OWNER,
  Permission.ADMIN,
];
