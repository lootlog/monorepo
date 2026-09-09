import { MessageScroller } from "@shadcn/react/message-scroller";
import { ChatTranscript, type ChatTranscriptProps } from "./chat-transcript";

export const ChatMessageList = (props: ChatTranscriptProps) => (
  <MessageScroller.Provider
    autoScroll
    defaultScrollPosition={props.position?.atEnd === false ? "start" : "end"}
    scrollEdgeThreshold={1}
    scrollPreviousItemPeek={0}
  >
    <ChatTranscript {...props} />
  </MessageScroller.Provider>
);
