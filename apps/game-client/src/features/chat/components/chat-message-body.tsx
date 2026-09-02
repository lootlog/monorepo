import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMentionText } from "@/features/chat/components/chat-mention-text";
import { ChatReplyPreview } from "@/features/chat/components/chat-reply-preview";
import {
  getChatMentionSegments,
  type ChatMentionContext,
} from "@/features/chat/chat-mentions.helpers";
import { cn } from "@/lib/utils";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import { Loader2 } from "lucide-react";
import type { ChangeEventHandler, FC, FormEventHandler } from "react";
import { useTranslation } from "react-i18next";
import { getChatMessageBody } from "./chat-message.helpers";

type ChatMessageBodyProps = {
  draftMessage: string;
  isDeleting: boolean;
  isEditing: boolean;
  isMsgYesterday: boolean;
  isUpdating: boolean;
  mentionContext?: ChatMentionContext;
  message: ChatMessageType;
  onCancel: () => void;
  onDraftChange: ChangeEventHandler<HTMLInputElement>;
  onScrollToOriginal: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export const ChatMessageBody: FC<ChatMessageBodyProps> = ({
  draftMessage,
  isDeleting,
  isEditing,
  isMsgYesterday,
  isUpdating,
  mentionContext,
  message,
  onCancel,
  onDraftChange,
  onScrollToOriginal,
  onSubmit,
}) => {
  const { t } = useTranslation("chat");
  const messageBody = getChatMessageBody(message);
  const mentionSegments = messageBody
    ? getChatMentionSegments(messageBody.text, mentionContext)
    : [];

  if (isEditing) {
    return (
      <form
        className="ll:inline-flex ll:w-full ll:max-w-full ll:items-center ll:gap-[var(--ll-chat-space-sm)]"
        onSubmit={onSubmit}
      >
        <Input
          value={draftMessage}
          disabled={isUpdating}
          maxLength={128}
          onChange={onDraftChange}
          className="ll:h-[var(--ll-chat-control-height)] ll:flex-1"
        />
        <Button
          type="submit"
          disabled={isUpdating || draftMessage.trim().length === 0}
        >
          {isUpdating ? (
            <Loader2
              aria-hidden
              className="ll:size-3 ll:animate-spin ll:motion-reduce:animate-none"
            />
          ) : (
            t("edit.save")
          )}
        </Button>
        <Button type="button" disabled={isUpdating} onClick={onCancel}>
          {t("edit.cancel")}
        </Button>
      </form>
    );
  }

  return (
    <span
      className="ll:whitespace-pre-wrap ll:select-text"
      style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
    >
      {isDeleting ? (
        <Loader2
          aria-label={t("contextMenu.deleting")}
          className="ll:mr-1 ll:inline ll:size-3 ll:animate-spin ll:motion-reduce:animate-none"
        />
      ) : null}
      {message.replyTo && (
        <ChatReplyPreview
          reply={message.replyTo}
          onClick={onScrollToOriginal}
          className="ll:mb-[var(--ll-chat-space-sm)] ll:max-w-[24rem]"
        />
      )}
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
