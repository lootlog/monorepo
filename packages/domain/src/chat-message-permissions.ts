import { Capability, createAccessPolicy } from "./access-policy.js";

type ChatMessageViewer = {
  readonly discordId: string;
  readonly permissions: readonly Capability[];
};

export const canDeleteChatMessage = (
  viewer: ChatMessageViewer,
  message: { readonly senderId: string },
) => {
  return (
    (viewer.discordId === message.senderId &&
      createAccessPolicy({ capabilities: viewer.permissions }).allows(
        Capability.LOOTLOG_CHAT_WRITE,
      )) ||
    createAccessPolicy({ capabilities: viewer.permissions }).allows(
      Capability.ADMIN,
    )
  );
};
