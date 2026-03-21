import { Role, NpcType, Permission } from "prisma/generated/client";
import { getNpcTypeByWt } from "@lootlog/types";
import { MessageType, SendMessageDto } from "src/chat/dto/send-message.dto";

type NpcData = NonNullable<SendMessageDto["npc"]>;

const getNpcPermission = (npcType: NpcType): Permission => {
  if (npcType === NpcType.TITAN) return Permission.LOOTLOG_CHAT_TITANS_READ;
  if (npcType === NpcType.HERO || npcType === NpcType.EVENT_HERO)
    return Permission.LOOTLOG_CHAT_HEROES_READ;
  return Permission.LOOTLOG_CHAT_READ;
};

const hasNpcPermission = (npc: NpcData, npcType: NpcType, roles: Role[]) => {
  const permission = getNpcPermission(npcType);

  return roles.some(
    (role) =>
      role.permissions.includes(permission) &&
      role.lvlRangeFrom <= npc.lvl &&
      role.lvlRangeTo >= npc.lvl,
  );
};

export const canViewChatMessage = (data: SendMessageDto, roles: Role[]) => {
  if (!data) return false;
  const canReadChatMessages = roles.some((role) =>
    role.permissions.includes(Permission.LOOTLOG_CHAT_READ),
  );
  if (!canReadChatMessages) return false;

  if (
    data.type === MessageType.NPC ||
    (data.type === MessageType.PARTY_GATHERING && data.npc)
  ) {
    const npc = data.npc;
    if (!npc) return false;

    const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
    return hasNpcPermission(npc, npcType, roles);
  }

  return true;
};
