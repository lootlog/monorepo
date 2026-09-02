import { hasRolePermissionInLevelRange } from "@lootlog/domain/npc-permissions";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import type { NpcRoutingTier } from "@lootlog/schema/npc-routing";
import { Permission } from "@lootlog/schema/permissions";
import { MessageType } from "#src/chat/dto/send-message.dto";
import type { ChatStoredMessage } from "#src/chat/types/chat-stored-message.type";

type NpcData = NonNullable<ChatStoredMessage["npc"]>;
type Role = {
  permissions: Permission[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

const NPC_TIER_PERMISSIONS: Record<NpcRoutingTier, Permission> = {
  base: Permission.LOOTLOG_CHAT_READ,
  titans: Permission.LOOTLOG_CHAT_TITANS_READ,
  heroes: Permission.LOOTLOG_CHAT_HEROES_READ,
};

const hasPermission = (roles: Role[], permission: Permission) => {
  return roles.some((role) => role.permissions.includes(permission));
};

const isNpcScopedMessage = (data: ChatStoredMessage) => {
  return (
    data.type === MessageType.NPC ||
    (data.type === MessageType.PARTY_GATHERING && data.npc !== undefined)
  );
};

const hasNpcTierPermission = (npc: NpcData, roles: Role[]) => {
  const permission = NPC_TIER_PERMISSIONS[getNpcRoutingTier(npc)];

  return hasRolePermissionInLevelRange(roles, permission, npc.lvl);
};

export const canViewChatMessage = (
  data: ChatStoredMessage | null | undefined,
  roles: Role[],
) => {
  if (!data) return false;

  if (!hasPermission(roles, Permission.LOOTLOG_CHAT_READ)) return false;

  if (isNpcScopedMessage(data)) {
    const npc = data.npc;
    if (!npc) return false;

    return hasNpcTierPermission(npc, roles);
  }

  return true;
};
