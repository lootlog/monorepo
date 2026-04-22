import { MessageType } from "@/api/chat.api";
import type { ChatMessageResponseDtoOutput } from "@/lib/api/generated/main/model";
import type { ChatReplyDraft } from "@/store/chat.store";

const MAX_REPLY_SNIPPET_LENGTH = 72;
const ELLIPSIS = "...";
type ReplyableChatMessageType =
  | typeof MessageType.NORMAL
  | typeof MessageType.NOTIFICATION;

type ReplyLike = Pick<ChatReplyDraft, "message" | "type">;

export const canReplyToChatMessage = (
  message: Pick<ChatMessageResponseDtoOutput, "type">,
): message is Pick<ChatMessageResponseDtoOutput, "type"> & {
  type: ReplyableChatMessageType;
} => {
  return (
    message.type === MessageType.NORMAL ||
    message.type === MessageType.NOTIFICATION
  );
};

export const getChatReplySnippet = ({ message, type }: ReplyLike) => {
  const replyText =
    type === MessageType.NOTIFICATION ? `[P] ${message}` : message;

  if (replyText.length <= MAX_REPLY_SNIPPET_LENGTH) {
    return replyText;
  }

  return `${replyText.slice(0, MAX_REPLY_SNIPPET_LENGTH - ELLIPSIS.length)}${ELLIPSIS}`;
};
