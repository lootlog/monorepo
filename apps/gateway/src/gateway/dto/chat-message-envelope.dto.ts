import type { SendMessageDto } from "#src/gateway/dto/send-message.dto";

export type ChatMessageEnvelopeDto = SendMessageDto & {
  canEdit: boolean;
  canDelete: boolean;
};
