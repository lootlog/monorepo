import type { SendChatMessageRequest } from "#src/contracts/chat/schemas";

export type ChatStoredMessage = SendChatMessageRequest & {
  id: string;
  senderId: string;
  timestamp: string;
  guildId: string;
};
