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

export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: RolePermissionData[],
): boolean => {
  if (!npc) return false;

  if (npc.type === "TITAN") {
    return roles.some(
      (role) =>
        role.permissions.includes(PERMISSION.LOOTLOG_TIMERS_TITANS_READ) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  if (npc.type === "HERO" || npc.type === "EVENT_HERO") {
    return roles.some(
      (role) =>
        role.permissions.includes(PERMISSION.LOOTLOG_TIMERS_HEROES_READ) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  return roles.some(
    (role) =>
      role.lvlRangeFrom <= npc.lvl &&
      role.lvlRangeTo >= npc.lvl &&
      role.permissions.includes(PERMISSION.LOOTLOG_TIMERS_READ),
  );
};
