import { NpcType } from 'src/gateway/enums/npc-type.enum';
import type { Npc } from 'src/gateway/types/npc.type';
import { Permission } from '@lootlog/types';
import type { Role } from 'src/guilds/types/role.type';

export const canViewNpcNotification = (npc: Npc, roles: Role[]) => {
  if (!npc) {
    return roles.some((role) =>
      role.permissions.includes(Permission.LOOTLOG_NOTIFICATIONS_READ),
    );
  }

  if (npc.type === NpcType.TITAN) {
    return roles.some(
      (role) =>
        role.permissions.includes(
          Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
        ) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  if (npc.type === NpcType.HERO || npc.type === NpcType.EVENT_HERO) {
    return roles.some(
      (role) =>
        role.permissions.includes(
          Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
        ) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  return roles.some(
    (role) =>
      role.lvlRangeFrom <= npc.lvl &&
      role.lvlRangeTo >= npc.lvl &&
      role.permissions.includes(Permission.LOOTLOG_NOTIFICATIONS_READ),
  );
};
