import { MessageScroller } from "@shadcn/react/message-scroller";
import { useState } from "react";
import { ChatTranscript, type ChatTranscriptProps } from "./chat-transcript";

export const ChatMessageList = (props: ChatTranscriptProps) => {
  // The scroller re-applies its default position whenever this prop changes,
  // so freeze it for the lifetime of the mount; the parent remounts per transcript key.
  const [defaultScrollPosition] = useState<"start" | "end">(() =>
    props.position?.atEnd === false ? "start" : "end",
  );
  return (
    <MessageScroller.Provider
      autoScroll
      defaultScrollPosition={defaultScrollPosition}
      scrollEdgeThreshold={1}
      scrollPreviousItemPeek={0}
    >
      <ChatTranscript {...props} />
    </MessageScroller.Provider>
  );
};
