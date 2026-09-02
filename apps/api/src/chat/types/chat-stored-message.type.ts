import type { SendMessageDto } from "#src/http-api/lootlog-api";

export type ChatStoredMessage = SendMessageDto & {
  id: string;
  senderId: string;
  timestamp: string;
  guildId: string;
};
