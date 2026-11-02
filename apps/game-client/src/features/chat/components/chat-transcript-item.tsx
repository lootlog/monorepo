import { MessageScroller } from "@shadcn/react/message-scroller";
import type { ReactNode } from "react";

type ChatTranscriptItemProps = {
  /** Unset for a date divider, which the scroller does not track. */
  messageId?: string;
  messageGap: number;
  /** An NPC report card sits flush on the row below it. */
  flushBottom?: boolean;
  highlighted?: boolean;
  children: ReactNode;
};

/** One striped row of a chat transcript; message rows light up on hover. */
export const ChatTranscriptItem = ({
  messageId,
  messageGap,
  flushBottom = false,
  highlighted = false,
  children,
}: ChatTranscriptItemProps) => (
  <MessageScroller.Item
    messageId={messageId}
    role="listitem"
    style={{
      backgroundColor: highlighted ? "rgba(255, 255, 255, 0.18)" : undefined,
      paddingBlockStart: flushBottom ? messageGap : messageGap / 2,
      paddingBlockEnd: flushBottom ? 0 : messageGap / 2,
    }}
    className={`ll:min-w-0 ll:shrink-0 ll:pl-1.5 ll:pr-0.5 ll:odd:bg-white/5 ll:even:bg-black/25 ${messageId === undefined ? "" : "ll:odd:hover:bg-white/10 ll:even:hover:bg-white/10"}`}
  >
    {children}
  </MessageScroller.Item>
);
