import { NpcType } from 'src/gateway/enums/npc-type.enum';
import { Npc } from 'src/gateway/types/npc.type';
import { Permission } from 'src/guilds/enum/permission.type';
import { Role } from 'src/guilds/types/role.type';

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
