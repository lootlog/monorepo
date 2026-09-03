import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import type { ChatStoredMessage } from "#src/chat/chat-stored-message";
import type { ChatMessageViewer } from "#src/chat/chat-message-viewer";

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
