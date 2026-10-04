import { Capability, createAccessPolicy } from "./access-policy.js";

type ChatMessageViewer = {
  readonly discordId: string;
  readonly permissions: readonly Capability[];
};

export const canDeleteChatMessage = (
  viewer: ChatMessageViewer,
  message: { readonly senderId: string },
) => {
  const accessPolicy = createAccessPolicy({ capabilities: viewer.permissions });

  return (
    (viewer.discordId === message.senderId &&
      accessPolicy.allows(Capability.LOOTLOG_CHAT_WRITE)) ||
    accessPolicy.allows(Capability.ADMIN)
  );
};
