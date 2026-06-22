import { getNpcRoutingTier, type NpcRoutingTier } from "@lootlog/types";

export type NpcPermissionData = {
  lvl: number;
  type: string;
};

export type RolePermissionData = {
  permissions: string[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

const PERMISSION = {
  LOOTLOG_TIMERS_READ: "LOOTLOG_TIMERS_READ",
  LOOTLOG_TIMERS_TITANS_READ: "LOOTLOG_TIMERS_TITANS_READ",
  LOOTLOG_TIMERS_HEROES_READ: "LOOTLOG_TIMERS_HEROES_READ",
} as const;

type TimerPermission = (typeof PERMISSION)[keyof typeof PERMISSION];

const TIMER_PERMISSION_BY_TIER: Record<NpcRoutingTier, TimerPermission> = {
  base: PERMISSION.LOOTLOG_TIMERS_READ,
  titans: PERMISSION.LOOTLOG_TIMERS_TITANS_READ,
  heroes: PERMISSION.LOOTLOG_TIMERS_HEROES_READ,
};

const isNpcLevelWithinRoleRange = (
  role: RolePermissionData,
  npcLevel: number,
): boolean => role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel;

export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: RolePermissionData[],
): boolean => {
  if (!npc) return false;

  const requiredTimerPermission =
    TIMER_PERMISSION_BY_TIER[getNpcRoutingTier(npc)];

  return roles.some(
    (role) =>
      role.permissions.includes(requiredTimerPermission) &&
      isNpcLevelWithinRoleRange(role, npc.lvl),
  );
};
