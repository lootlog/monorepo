import { getNpcRoutingTier, type NpcRoutingTier } from "@lootlog/types";
import { Permission, type Role } from "src/generated/prisma/client";
import {
  MessageType,
  type SendMessageDto,
} from "src/chat/dto/send-message.dto";

type NpcData = NonNullable<SendMessageDto["npc"]>;

const NPC_TIER_PERMISSIONS: Record<NpcRoutingTier, Permission> = {
  base: Permission.LOOTLOG_CHAT_READ,
  titans: Permission.LOOTLOG_CHAT_TITANS_READ,
  heroes: Permission.LOOTLOG_CHAT_HEROES_READ,
};

const hasNpcPermission = (npc: NpcData, roles: Role[]) => {
  const permission = NPC_TIER_PERMISSIONS[getNpcRoutingTier(npc)];

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

    return hasNpcPermission(npc, roles);
  }

  return true;
};
