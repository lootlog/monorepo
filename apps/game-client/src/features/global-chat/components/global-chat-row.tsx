import { MessageScroller } from "@shadcn/react/message-scroller";
import { memo } from "react";
import { cn } from "cn";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import { ChatDateDivider } from "@/features/chat/components/chat-date-divider";
import { ChatPlayerMessageView } from "@/features/chat/components/chat-player-message-view";
import { isChatMessageYesterdayOrOlder } from "@/features/chat/components/chat-message.helpers";
import type { GlobalChatRow as GlobalChatRowData } from "../global-chat.helpers";

type GlobalChatRowProps = {
  appearance: ChatAppearanceSettings;
  row: GlobalChatRowData;
};

// A divider's label depends only on its day, which its key names.
const areRowPropsEqual = (
  previous: GlobalChatRowProps,
  next: GlobalChatRowProps,
) =>
  previous.appearance === next.appearance &&
  previous.row.key === next.row.key &&
  (previous.row.kind === "message"
    ? next.row.kind === "message" && previous.row.message === next.row.message
    : next.row.kind === "date-divider");

/**
 * Memoized like ChatTranscriptRow, where every incoming message re-rendered
 * every row (measured 502 row renders per message without it). Rows are
 * rebuilt per render, but their message objects keep their identity across
 * live appends.
 */
export const GlobalChatRow = memo(function GlobalChatRow({
  appearance,
  row,
}: GlobalChatRowProps) {
  const messageGap = appearance.messageGapPx;

  if (row.kind === "date-divider") {
    return (
      <MessageScroller.Item
        role="listitem"
        style={{
          paddingBlockStart: messageGap / 2,
          paddingBlockEnd: messageGap / 2,
        }}
        className="ll:min-w-0 ll:shrink-0 ll:pl-1.5 ll:pr-0.5 ll:odd:bg-white/5 ll:even:bg-black/25"
      >
        <ChatDateDivider timestamp={row.timestamp} />
      </MessageScroller.Item>
    );
  }

  const { message } = row;
  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);

  return (
    <MessageScroller.Item
      messageId={message.id}
      role="listitem"
      style={{
        paddingBlockStart: messageGap / 2,
        paddingBlockEnd: messageGap / 2,
      }}
      className="ll:min-w-0 ll:shrink-0 ll:pl-1.5 ll:pr-0.5 ll:odd:bg-white/5 ll:even:bg-black/25 ll:odd:hover:bg-white/10 ll:even:hover:bg-white/10"
    >
      <ChatPlayerMessageView
        all={false}
        appearance={appearance}
        guildName=""
        isMsgYesterday={isMsgYesterday}
        messageId={message.id}
        timestamp={message.timestamp}
        sender={
          <span
            // Marks the caller's own name like a mention of the current user.
            className={cn("ll:inline-block ll:font-bold ll:mr-0.5", {
              "ll:rounded-sm ll:px-0.5 ll:bg-white/14 ll:ring-1 ll:ring-white/20":
                message.isOwn,
            })}
          >
            {message.displayName}:
          </span>
        }
        body={
          <span
            data-slot="bubble"
            className={cn("ll:whitespace-pre-wrap ll:select-text", {
              "ll:text-gray-200": isMsgYesterday,
            })}
            style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
          >
            {message.message}
          </span>
        }
      />
    </MessageScroller.Item>
  );
}, areRowPropsEqual);
