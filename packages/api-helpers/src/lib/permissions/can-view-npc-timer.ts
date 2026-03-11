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

const isNpcLevelWithinRoleRange = (
  role: RolePermissionData,
  npcLevel: number,
): boolean => role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel;

const getRequiredTimerPermission = (npcType: string): TimerPermission => {
  if (npcType === "TITAN") {
    return PERMISSION.LOOTLOG_TIMERS_TITANS_READ;
  }

  if (npcType === "HERO" || npcType === "EVENT_HERO") {
    return PERMISSION.LOOTLOG_TIMERS_HEROES_READ;
  }

  return PERMISSION.LOOTLOG_TIMERS_READ;
};

export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: RolePermissionData[],
): boolean => {
  if (!npc) return false;

  const requiredTimerPermission = getRequiredTimerPermission(npc.type);

  return roles.some(
    (role) =>
      role.permissions.includes(requiredTimerPermission) &&
      isNpcLevelWithinRoleRange(role, npc.lvl),
  );
};
