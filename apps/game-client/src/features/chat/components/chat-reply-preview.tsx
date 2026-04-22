import { cn } from "@/lib/utils";
import { getChatReplySnippet } from "@/features/chat/chat-reply.helpers";
import type { ChatReplyDraft } from "@/store/chat.store";
import { X } from "lucide-react";
import type { FC, MouseEvent } from "react";

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
        "ll:flex ll:items-start ll:justify-between ll:gap-2 ll:rounded-sm ll:border-l-2 ll:border-gray-500 ll:bg-gray-700/30 ll:px-2 ll:py-1",
        {
          "ll:cursor-pointer ll:hover:bg-gray-700/45": !!onClick,
        },
        className,
      )}
      onClick={onClick}
    >
      <div className="ll:min-w-0 ll:flex-1">
        <div className="ll:text-[10px] ll:font-semibold ll:text-gray-200">
          {reply.senderNick}
        </div>
        <div className="ll:text-[10px] ll:text-gray-400 ll:whitespace-pre-wrap ll:break-words">
          {getChatReplySnippet(reply)}
        </div>
      </div>
      {onClear && (
        <button
          type="button"
          className="ll:mt-0.5 ll:text-gray-400 ll:hover:text-gray-200"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onClear();
          }}
        >
          <X className="ll:h-3 ll:w-3" />
        </button>
      )}
    </div>
  );
};
