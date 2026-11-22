import { MessageScroller } from "@shadcn/react/message-scroller";
import { useState } from "react";
import { ChatTranscript, type ChatTranscriptProps } from "./chat-transcript";

export const ChatMessageList = (props: ChatTranscriptProps) => {
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
