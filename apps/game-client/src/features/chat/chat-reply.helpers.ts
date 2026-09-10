import { MessageType } from "@/api/chat.api";
import type { ChatMessageResponseDtoOutput } from "@lootlog/client/main";
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

export const getChatReplyText = ({ message, type }: ReplyLike) =>
  type === MessageType.NOTIFICATION ? `[P] ${message}` : message;

export const getChatReplySnippet = (reply: ReplyLike) => {
  const replyText = getChatReplyText(reply);

  if (replyText.length <= MAX_REPLY_SNIPPET_LENGTH) {
    return replyText;
  }

  return `${replyText.slice(0, MAX_REPLY_SNIPPET_LENGTH - ELLIPSIS.length)}${ELLIPSIS}`;
};

export const resolveChatReplyNames = (
  messages: ChatMessageResponseDtoOutput[],
  messagesByGuildId: Record<string, ChatMessageResponseDtoOutput[]>,
  membersByGuildId: Record<string, Record<string, { name: string }>>,
): ChatMessageResponseDtoOutput[] => {
  const namesByGuild = new Map(
    Object.entries(messagesByGuildId).map(([guildId, history]) => [
      guildId,
      new Map(
        history.map((message) => [
          message.id,
          membersByGuildId[guildId]?.[message.senderId]?.name,
        ]),
      ),
    ]),
  );

  return messages.map((message) => {
    if (!message.replyTo) return message;

    const name = namesByGuild
      .get(message.guildId)
      ?.get(message.replyTo.messageId);

    if (!name || name === message.replyTo.senderNick) return message;

    return { ...message, replyTo: { ...message.replyTo, senderNick: name } };
  });
};
