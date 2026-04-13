import { Permission } from "@lootlog/types";

export type NpcPermissionData = {
  lvl: number;
  type: string;
};

export type RolePermissionData = {
  permissions: string[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

const isNpcLevelWithinRoleRange = (
  role: RolePermissionData,
  npcLevel: number,
): boolean => role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel;

const getRequiredTimerPermission = (npcType: string): Permission => {
  if (npcType === "TITAN") {
    return Permission.LOOTLOG_TIMERS_TITANS_READ;
  }

  if (npcType === "HERO" || npcType === "EVENT_HERO") {
    return Permission.LOOTLOG_TIMERS_HEROES_READ;
  }

  return Permission.LOOTLOG_TIMERS_READ;
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
