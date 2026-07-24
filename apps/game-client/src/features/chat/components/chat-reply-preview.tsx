import { cn } from "@/lib/utils";
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
  return (
    <div
      className={cn(
        "ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:items-start ll:justify-between ll:gap-[var(--ll-chat-space-lg)] ll:overflow-hidden ll:rounded-sm ll:border-l-2 ll:border-gray-500 ll:bg-gray-700/30 ll:px-[var(--ll-chat-space-lg)] ll:py-[var(--ll-chat-space-sm)]",
        {
          "ll:cursor-pointer ll:hover:bg-gray-700/45": !!onClick,
        },
        className,
      )}
      onClick={onClick}
    >
      <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:flex-1 ll:flex-col ll:overflow-hidden">
        <div className="ll:w-full ll:min-w-0 ll:max-w-full ll:truncate ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:font-semibold ll:text-gray-200">
          {reply.senderNick}
        </div>
        <div className="ll:w-full ll:min-w-0 ll:max-w-full ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:text-gray-400 ll:whitespace-pre-wrap ll:break-words">
          {getChatReplySnippet(reply)}
        </div>
      </div>
      {onClear && (
        <Button
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
