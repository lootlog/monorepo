import type { ChatMessageRoutingDto } from "src/gateway/dto/chat-message-update.dto";

export class ChatMessageDeleteDto {
  guildId: string;
  messageId: string;
  routing: ChatMessageRoutingDto;
}
