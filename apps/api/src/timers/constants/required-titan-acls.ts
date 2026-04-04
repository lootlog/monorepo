import { Permission } from "src/generated/prisma/client";

export const ELIGIBLE_TITAN_READ_ACL = [
  Permission.LOOTLOG_TIMERS_TITANS_READ,
  Permission.OWNER,
  Permission.ADMIN,
];
