import {
  hasRolePermissionInLevelRange,
  NPC_FEATURE_PERMISSIONS,
} from "@lootlog/domain/npc-permissions";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { MessageType } from "#src/chat/chat-message";
import type { ChatStoredMessage } from "#src/chat/chat-stored-message";
import type { ChatMessageViewer } from "#src/chat/chat-message-viewer";

type NpcData = NonNullable<ChatStoredMessage["npc"]>;
type Role = {
  permissions: Permission[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
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
  const permission = NPC_FEATURE_PERMISSIONS.chat[getNpcRoutingTier(npc)];

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

export const canViewerReadChatMessage = (
  viewer: ChatMessageViewer,
  message: ChatStoredMessage,
) =>
  createAccessPolicy({ capabilities: viewer.permissions }).allows(
    Capability.ADMIN,
  ) || canViewChatMessage(message, viewer.roles);
