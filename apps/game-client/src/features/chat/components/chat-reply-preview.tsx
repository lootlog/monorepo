import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { getChatReplySnippet } from "@/features/chat/chat-reply.helpers";
import type { ChatReplyDraft } from "@/store/chat.store";
import { X } from "lucide-react";
import type { FC, MouseEvent } from "react";
import { Button } from "@/components/ui/button";

type ChatReplyPreviewProps = {
  reply: Pick<ChatReplyDraft, "senderNick" | "message" | "type">;
  onClick?: () => void;
  onClear?: () => void;
  className?: string;
};

export const ChatReplyPreview: FC<ChatReplyPreviewProps> = ({
  reply,
  onClick,
  onClear,
  className,
}) => {
  const { t } = useTranslation("chat");
  const Content = onClick ? "button" : "div";
  return (
    <div
      className={cn(
        "ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:items-start ll:justify-between ll:gap-[var(--ll-chat-space-lg)] ll:overflow-hidden ll:rounded-sm ll:border-0 ll:bg-white/20 ll:italic ll:text-gray-100 ll:px-[var(--ll-chat-space-lg)] ll:py-[var(--ll-chat-space-sm)]",
        {
          "ll:cursor-pointer ll:hover:bg-white/25": !!onClick,
        },
        className,
      )}
    >
      <Content
        style={{
          appearance: "none",
          background: "transparent",
          border: 0,
          padding: 0,
          margin: 0,
          color: "inherit",
          font: "inherit",
          boxShadow: "none",
        }}
        type={onClick ? "button" : undefined}
        onClick={onClick}
        aria-label={
          onClick
            ? t("messageActions.showOriginal", { name: reply.senderNick })
            : undefined
        }
        className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:flex-1 ll:flex-col ll:overflow-hidden ll:text-left ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
      >
        <div className="ll:w-full ll:min-w-0 ll:max-w-full ll:truncate ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:font-semibold ll:text-gray-100">
          {reply.senderNick}
        </div>
        <div className="ll:w-full ll:min-w-0 ll:max-w-full ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:text-gray-300 ll:whitespace-pre-wrap ll:break-words">
          {getChatReplySnippet(reply)}
        </div>
      </Content>
      {onClear && (
        <Button
          aria-label={t("messageActions.clearReply")}
          type="button"
          className="ll:mt-[var(--ll-chat-space-sm)] ll:shrink-0"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onClear();
          }}
        >
          <X className="ll:h-[var(--ll-chat-icon-size)] ll:w-[var(--ll-chat-icon-size)]" />
        </Button>
      )}
    </div>
  );
};
