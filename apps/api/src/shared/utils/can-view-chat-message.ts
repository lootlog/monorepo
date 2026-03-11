import { Role, NpcType, Permission } from "generated/client";
import { getNpcTypeByWt } from "@lootlog/types";
import { MessageType, SendMessageDto } from "src/chat/dto/send-message.dto";

export const canViewChatMessage = (data: SendMessageDto, roles: Role[]) => {
  if (!data) return false;
  const canReadChatMessages = roles.some((role) =>
    role.permissions.includes(Permission.LOOTLOG_CHAT_READ),
  );
  if (!canReadChatMessages) return false;

  if (data.type === MessageType.NPC) {
    const npc = data.npc;
    if (!npc) return false;

    const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);

    if (npcType === NpcType.TITAN) {
      return roles.some(
        (role) =>
          role.permissions.includes(Permission.LOOTLOG_CHAT_TITANS_READ) &&
          role.lvlRangeFrom <= npc.lvl &&
          role.lvlRangeTo >= npc.lvl,
      );
    }

    if (npcType === NpcType.HERO || npcType === NpcType.EVENT_HERO) {
      return roles.some(
        (role) =>
          role.permissions.includes(Permission.LOOTLOG_CHAT_HEROES_READ) &&
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

  if (data.type === MessageType.PARTY_GATHERING && data.npc) {
    const npc = data.npc;
    const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);

    if (npcType === NpcType.TITAN) {
      return roles.some(
        (role) =>
          role.permissions.includes(Permission.LOOTLOG_CHAT_TITANS_READ) &&
          role.lvlRangeFrom <= npc.lvl &&
          role.lvlRangeTo >= npc.lvl,
      );
    }

    if (npcType === NpcType.HERO || npcType === NpcType.EVENT_HERO) {
      return roles.some(
        (role) =>
          role.permissions.includes(Permission.LOOTLOG_CHAT_HEROES_READ) &&
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
