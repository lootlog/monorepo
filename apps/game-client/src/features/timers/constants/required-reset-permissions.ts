import { Capability } from "@lootlog/schema/permissions";

export const REQUIRED_RESET_PERMISSIONS = [
  Capability.LOOTLOG_MANAGE,
  Capability.OWNER,
  Capability.ADMIN,
  Capability.LOOTLOG_TIMERS_RESET,
];
