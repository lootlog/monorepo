import { Capability, createAccessPolicy } from "./access-policy.js";

type ChatMessageViewer = {
  readonly discordId: string;
  readonly permissions: readonly Capability[];
};

export const canEditChatMessage = (
  viewer: ChatMessageViewer,
  message: { readonly senderId: string },
) => {
  return (
    viewer.discordId === message.senderId &&
    createAccessPolicy({ capabilities: viewer.permissions }).allows(
      Capability.LOOTLOG_CHAT_WRITE,
    )
  );
};

export const canDeleteChatMessage = (
  viewer: ChatMessageViewer,
  message: { readonly senderId: string },
) => {
  return (
    canEditChatMessage(viewer, message) ||
    createAccessPolicy({ capabilities: viewer.permissions }).allows(
      Capability.ADMIN,
    )
  );
};
