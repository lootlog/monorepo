export type NpcPermissionData = {
  lvl: number;
  type: string;
};

export type RolePermissionData = {
  permissions: readonly string[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

const PERMISSION = {
  LOOTLOG_TIMERS_READ: "LOOTLOG_TIMERS_READ",
  LOOTLOG_TIMERS_TITANS_READ: "LOOTLOG_TIMERS_TITANS_READ",
  LOOTLOG_TIMERS_HEROES_READ: "LOOTLOG_TIMERS_HEROES_READ",
} as const;

type TimerPermission = (typeof PERMISSION)[keyof typeof PERMISSION];
type TimerPermissionTier = "base" | "titans" | "heroes";

const TIMER_PERMISSION_BY_TIER: Record<TimerPermissionTier, TimerPermission> = {
  base: PERMISSION.LOOTLOG_TIMERS_READ,
  titans: PERMISSION.LOOTLOG_TIMERS_TITANS_READ,
  heroes: PERMISSION.LOOTLOG_TIMERS_HEROES_READ,
};

const TIMER_PERMISSION_TIER_BY_NPC_TYPE: Partial<
  Record<string, TimerPermissionTier>
> = {
  TITAN: "titans",
  HERO: "heroes",
  EVENT_HERO: "heroes",
};

const isNpcLevelWithinRoleRange = (
  role: RolePermissionData,
  npcLevel: number,
): boolean => role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel;

export const hasRolePermissionInLevelRange = (
  roles: readonly RolePermissionData[],
  permission: string,
  npcLevel: number,
): boolean =>
  roles.some(
    (role) =>
      role.permissions.includes(permission) &&
      isNpcLevelWithinRoleRange(role, npcLevel),
  );

const getRequiredTimerPermission = (npcType: string): TimerPermission =>
  TIMER_PERMISSION_BY_TIER[
    TIMER_PERMISSION_TIER_BY_NPC_TYPE[npcType] ?? "base"
  ];

export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: readonly RolePermissionData[],
): boolean => {
  if (!npc) return false;

  const requiredTimerPermission = getRequiredTimerPermission(npc.type);

  return hasRolePermissionInLevelRange(roles, requiredTimerPermission, npc.lvl);
};
