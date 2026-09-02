import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import type { ChatStoredMessage } from "#src/chat/types/chat-stored-message.type";
import type { ChatMessageViewer } from "#src/chat/types/chat-message-viewer.type";

export const canEditChatMessage = (
  viewer: ChatMessageViewer,
  message: Pick<ChatStoredMessage, "senderId">,
) => {
  return viewer.discordId === message.senderId;
};

export const canDeleteChatMessage = (
  viewer: ChatMessageViewer,
  message: Pick<ChatStoredMessage, "senderId">,
) => {
  return (
    viewer.discordId === message.senderId ||
    createAccessPolicy({ capabilities: viewer.permissions }).allows(
      Capability.ADMIN,
    )
  );
};
