import type { SendMessageDto } from "#src/http-api/contracts/chat/schemas";

export type ChatStoredMessage = SendMessageDto & {
  id: string;
  senderId: string;
  timestamp: string;
  guildId: string;
};
