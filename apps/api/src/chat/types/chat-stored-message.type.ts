import type { SendMessageDto } from "#src/chat/dto/send-message.dto";

export type ChatStoredMessage = SendMessageDto & {
  id: string;
  senderId: string;
  timestamp: string;
  guildId: string;
};
