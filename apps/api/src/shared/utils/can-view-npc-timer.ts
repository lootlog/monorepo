import { NpcType, Permission, type Role } from 'generated/client';

export const canViewNpcTimer = (
  npc: { lvl: number; type: NpcType } | null,
  roles: Role[],
) => {
  if (!npc) return false;

  if (npc.type === NpcType.TITAN) {
    return roles.some(
      (role) =>
        role.permissions.includes(Permission.LOOTLOG_TIMERS_TITANS_READ) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  if (npc.type === NpcType.HERO || npc.type === NpcType.EVENT_HERO) {
    return roles.some(
      (role) =>
        role.permissions.includes(Permission.LOOTLOG_TIMERS_HEROES_READ) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  return roles.some(
    (role) =>
      role.lvlRangeFrom <= npc.lvl &&
      role.lvlRangeTo >= npc.lvl &&
      role.permissions.includes(Permission.LOOTLOG_TIMERS_READ),
  );
};
