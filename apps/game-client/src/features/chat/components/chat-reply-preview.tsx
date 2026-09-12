import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  getChatReplySnippet,
  getChatReplyText,
} from "@/features/chat/chat-reply.helpers";
import type { ChatReplyDraft } from "@/store/chat.store";
import { Reply, X } from "lucide-react";
import type { FC, MouseEvent } from "react";
import { Button } from "@/components/ui/button";

type ChatReplyPreviewProps = {
  reply: Pick<ChatReplyDraft, "senderNick" | "message" | "type">;
  onClick?: () => void;
  onClear?: () => void;
  className?: string;
  variant?: "default" | "compact";
};

export const ChatReplyPreview: FC<ChatReplyPreviewProps> = ({
  reply,
  onClick,
  onClear,
  className,
  variant = "default",
}) => {
  const { t } = useTranslation("chat");
  const compact = variant === "compact";
  const Content = onClick ? "button" : "div";

  return (
    <div
      className={cn(
        "ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:items-start ll:justify-between ll:gap-[var(--ll-chat-space-lg)] ll:overflow-hidden ll:rounded-none ll:border-0 ll:text-gray-100 ll:p-0 ll:bg-zinc-800/70",
        compact
          ? "ll:not-italic ll:text-[length:var(--ll-chat-detail-font-size,10px)] ll:leading-[var(--ll-chat-detail-line-height,13px)]"
          : "ll:italic",
        {
          "ll:cursor-pointer": !!onClick,
          "ll:hover:bg-zinc-700/70": !!onClick,
        },
        !onClear && "ll:py-0.5",
        onClear &&
          "ll:items-center ll:pl-1 ll:py-0.5 ll:[--ll-chat-detail-font-size:9px] ll:[--ll-chat-detail-line-height:12px]",
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
          cursor: onClick ? "pointer" : undefined,
        }}
        type={onClick ? "button" : undefined}
        onClick={onClick}
        title={compact ? `${reply.senderNick}: ${reply.message}` : undefined}
        aria-label={
          onClick
            ? `${t("messageActions.showOriginal", { name: reply.senderNick })}${compact ? `: ${reply.message}` : ""}`
            : undefined
        }
        className={cn(
          "ll:w-full ll:min-w-0 ll:max-w-full ll:flex-1 ll:overflow-hidden ll:text-left ll:focus-visible:outline-2 ll:focus-visible:outline-ring",
          compact
            ? "ll:block ll:focus-visible:-outline-offset-2 ll:text-[length:var(--ll-chat-detail-font-size,10px)] ll:leading-[var(--ll-chat-detail-line-height,13px)]"
            : "ll:flex ll:flex-col",
          onClear && "ll:line-clamp-2",
        )}
      >
        {compact && (
          <Reply
            aria-hidden
            size={12}
            strokeWidth={1.5}
            className="ll:inline-block ll:align-text-bottom ll:mr-1 ll:text-gray-400"
          />
        )}
        <span
          className={cn(
            "ll:min-w-0 ll:truncate ll:text-[length:var(--ll-chat-detail-font-size,10px)] ll:leading-[var(--ll-chat-detail-line-height,13px)] ll:font-semibold ll:text-gray-100",
            compact
              ? "ll:inline-block ll:align-bottom ll:max-w-[35%] ll:mr-1"
              : "ll:w-full ll:max-w-full",
          )}
        >
          {reply.senderNick}
          {compact && ":"}
        </span>
        <span
          className={cn(
            "ll:min-w-0 ll:max-w-full ll:text-[length:var(--ll-chat-detail-font-size,10px)] ll:leading-[var(--ll-chat-detail-line-height,13px)] ll:font-normal ll:text-gray-300",
            compact
              ? "ll:whitespace-pre-wrap ll:[overflow-wrap:anywhere]"
              : "ll:w-full ll:whitespace-pre-wrap ll:break-words",
          )}
        >
          {compact ? getChatReplyText(reply) : getChatReplySnippet(reply)}
        </span>
      </Content>
      {onClear && (
        <Button
          size="xs"
          aria-label={t("messageActions.clearReply")}
          type="button"
          variant="ghost"
          className="ll:size-6 ll:shrink-0 ll:p-0 ll:mr-2 ll:border-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:focus-visible:-outline-offset-2"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onClear();
          }}
        >
          <X aria-hidden className="ll:size-3" />
        </Button>
      )}
    </div>
  );
};
