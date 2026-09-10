import { ChatMentionText } from "@/features/chat/components/chat-mention-text";
import {
  getChatMentionSegments,
  type ChatMentionContext,
} from "@/features/chat/chat-mentions.helpers";
import { cn } from "cn";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getChatMessageBody } from "./chat-message.helpers";

type ChatMessageBodyProps = {
  isDeleting: boolean;
  isMsgYesterday: boolean;
  mentionContext?: ChatMentionContext;
  message: ChatMessageType;
};

export const ChatMessageBody: FC<ChatMessageBodyProps> = ({
  isDeleting,
  isMsgYesterday,
  mentionContext,
  message,
}) => {
  const { t } = useTranslation("chat");
  const messageBody = getChatMessageBody(message);

  const mentionSegments = messageBody
    ? getChatMentionSegments(messageBody.text, mentionContext)
    : [];

  return (
    <span
      data-slot="bubble"
      className="ll:whitespace-pre-wrap ll:select-text"
      style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
    >
      {isDeleting ? (
        <Loader2
          aria-label={t("contextMenu.deleting")}
          className="ll:mr-1 ll:inline ll:size-3 ll:animate-spin ll:motion-reduce:animate-none"
        />
      ) : null}
      {messageBody && (
        <span
          className={cn("ll:select-text", {
            "ll:text-gray-200": isMsgYesterday,
          })}
          style={{ color: messageBody.color }}
        >
          <ChatMentionText segments={mentionSegments} />
        </span>
      )}
    </span>
  );
};
