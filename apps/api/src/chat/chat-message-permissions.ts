import { isAdministrativeUser } from "#src/shared/permissions/is-administrative-user";
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
    isAdministrativeUser(viewer.permissions)
  );
};
