import { MessageType } from "@/api/chat.api";
import type { ChatReplyDraft } from "@/store/chat.store";

export type ChatSubmitAction =
  | {
      kind: "clear";
    }
  | {
      kind: "party";
      description?: string;
    }
  | {
      kind: "notification";
      message: string;
    }
  | {
      kind: "message";
      message: string;
    };

export const getChatReplyPayload = (replyDraft: ChatReplyDraft | null) => {
  if (!replyDraft) {
    return undefined;
  }

  return {
    messageId: replyDraft.messageId,
    senderNick: replyDraft.senderNick,
    message: replyDraft.message,
    type: replyDraft.type,
  };
};

export const getChatSubmitAction = ({
  canClearChat,
  messageValue,
}: {
  canClearChat: boolean;
  messageValue: string;
}): ChatSubmitAction => {
  if (messageValue.trim() === "/clr" && canClearChat) {
    return {
      kind: "clear",
    };
  }

  if (messageValue.startsWith("/grp")) {
    return {
      kind: "party",
      description: messageValue.slice("/grp".length).trim() || undefined,
    };
  }

  if (messageValue.startsWith("!")) {
    return {
      kind: "notification",
      message: messageValue.length > 1 ? messageValue.slice(1) : messageValue,
    };
  }

  return {
    kind: "message",
    message: messageValue,
  };
};

export const getChatMessageTypeForSubmitAction = (
  action: Extract<ChatSubmitAction, { kind: "notification" | "message" }>,
) => {
  return action.kind === "notification"
    ? MessageType.NOTIFICATION
    : MessageType.NORMAL;
};
