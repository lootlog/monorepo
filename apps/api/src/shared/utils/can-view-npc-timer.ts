import { Npc, NpcType, Permission, Role } from 'generated/client';

export const canViewNpcTimer = (npc: Npc, roles: Role[]) => {
  if (!npc) return false;

  if (npc.type === NpcType.TITAN) {
    return roles.some(
      (role) =>
        role.permissions.includes(Permission.LOOTLOG_READ_TIMERS_TITANS) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  return roles.some(
    (role) => role.lvlRangeFrom <= npc.lvl && role.lvlRangeTo >= npc.lvl,
  );
};
