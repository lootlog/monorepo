import { NpcType } from 'src/gateway/enums/npc-type.enum';
import type { Npc } from 'src/gateway/types/npc.type';
import { Permission } from 'src/guilds/enum/permission.type';
import type { Role } from 'src/guilds/types/role.type';

export const canViewNpcNotification = (npc: Npc, roles: Role[]) => {
  if (!npc) return false;

  if (npc.type === NpcType.TITAN) {
    return roles.some(
      (role) =>
        role.permissions.includes(Permission.LOOTLOG_READ_TIMERS_TITANS) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  if (npc.type === NpcType.HERO || npc.type === NpcType.EVENT_HERO) {
    return roles.some(
      (role) =>
        role.permissions.includes(Permission.LOOTLOG_READ_TIMERS_HEROES) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  return roles.some(
    (role) =>
      role.lvlRangeFrom <= npc.lvl &&
      role.lvlRangeTo >= npc.lvl &&
      role.permissions.includes(Permission.LOOTLOG_READ),
  );
};
