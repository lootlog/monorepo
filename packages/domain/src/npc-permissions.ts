export type NpcPermissionData = {
  lvl: number;
  type: string;
};

export type RolePermissionData = {
  permissions: readonly string[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

const TIMER_PERMISSION = {
  base: "LOOTLOG_TIMERS_READ",
  titans: "LOOTLOG_TIMERS_TITANS_READ",
  heroes: "LOOTLOG_TIMERS_HEROES_READ",
} as const;

type TimerPermissionTier = keyof typeof TIMER_PERMISSION;

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

const getRequiredTimerPermission = (npcType: string): string =>
  TIMER_PERMISSION[TIMER_PERMISSION_TIER_BY_NPC_TYPE[npcType] ?? "base"];

export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: readonly RolePermissionData[],
): boolean => {
  if (!npc) return false;

  return hasRolePermissionInLevelRange(
    roles,
    getRequiredTimerPermission(npc.type),
    npc.lvl,
  );
};
