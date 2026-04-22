export type ChatMessageRoutingDto = {
  tier: "base" | "titans" | "heroes";
  npcLevel?: number;
};

export class ChatMessageUpdateDto {
  guildId: string;
  messageId: string;
  message: string;
  routing: ChatMessageRoutingDto;
}
