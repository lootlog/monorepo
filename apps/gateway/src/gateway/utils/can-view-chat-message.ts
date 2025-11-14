import { Permission } from 'src/guilds/enum/permission.type';
import type { Role } from 'src/guilds/types/role.type';
import { MessageType, SendMessageDto } from '../dto/send-message.dto';
import { NpcType } from '../enums/npc-type.enum';
import { getNpcTypeByWt } from './get-npc-type-by-wt';

export const canViewChatMessage = (data: SendMessageDto, roles: Role[]) => {
  if (!data) return false;
  const canReadChatMessages = roles.some((role) =>
    role.permissions.includes(Permission.LOOTLOG_CHAT_READ),
  );
  if (!canReadChatMessages) return false;

  if (data.type === MessageType.NPC) {
    const npc = data.npc;
    if (!npc) return false;

    const npcType = getNpcTypeByWt(Number(npc.wt), npc.prof, Number(npc.type));

    if (npcType === NpcType.TITAN) {
      return roles.some(
        (role) =>
          role.permissions.includes(Permission.LOOTLOG_READ_TIMERS_TITANS) &&
          role.lvlRangeFrom <= npc.lvl &&
          role.lvlRangeTo >= npc.lvl,
      );
    }

    if (npcType === NpcType.HERO || npcType === NpcType.EVENT_HERO) {
      return roles.some(
        (role) =>
          role.permissions.includes(Permission.LOOTLOG_READ_TIMERS_HEROES) &&
          role.lvlRangeFrom <= npc.lvl &&
          role.lvlRangeTo >= npc.lvl,
      );
    }

    return roles.some(
      (role) =>
        role.permissions.includes(Permission.LOOTLOG_CHAT_READ) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  return true;
};
