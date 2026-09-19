import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { MessageType } from "#src/chat/chat-message";
import { canReadChatNpcSource } from "#src/chat/chat-npc-visibility";
import type { ChatStoredMessage } from "#src/chat/chat-stored-message";
import type { ChatMessageViewer } from "#src/chat/chat-message-viewer";

type Role = {
  permissions: Permission[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

const isNpcScopedMessage = (data: ChatStoredMessage) => {
  return (
    data.type === MessageType.NPC ||
    (data.type === MessageType.PARTY_GATHERING && data.npc !== undefined)
  );
};

export const canViewChatMessage = (
  data: ChatStoredMessage | null | undefined,
  roles: Role[],
) => {
  if (!data) return false;

  if (!isNpcScopedMessage(data)) return canReadChatNpcSource(roles, null);
  const npc = data.npc;

  if (!npc) return false;

  return canReadChatNpcSource(roles, npc);
};

export const canViewerReadChatMessage = (
  viewer: ChatMessageViewer,
  message: ChatStoredMessage,
) =>
  createAccessPolicy({ capabilities: viewer.permissions }).allows(
    Capability.ADMIN,
  ) || canViewChatMessage(message, viewer.roles);
