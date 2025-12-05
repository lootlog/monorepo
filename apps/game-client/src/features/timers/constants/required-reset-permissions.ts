import { Permission } from "@lootlog/types";

export const REQUIRED_RESET_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_TIMERS_RESET,
];
