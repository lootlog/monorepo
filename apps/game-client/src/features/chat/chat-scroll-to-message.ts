const CHAT_SCROLL_TO_MESSAGE_EVENT = "lootlog:chat-scroll-to-message";
import { addMeasuredEventListener } from "@/lib/performance-monitoring/measured-callback";

export type ChatScrollToMessageEvent = CustomEvent<{ messageId: string }>;

export const dispatchChatScrollToMessage = (messageId: string) => {
  window.dispatchEvent(
    new CustomEvent(CHAT_SCROLL_TO_MESSAGE_EVENT, {
      detail: { messageId },
    }),
  );
};

export const subscribeToChatScrollToMessage = (
  listener: (event: ChatScrollToMessageEvent) => void,
) => {
  const eventListener = (event: Event) =>
    listener(event as ChatScrollToMessageEvent);

  return addMeasuredEventListener(
    window,
    CHAT_SCROLL_TO_MESSAGE_EVENT,
    eventListener,
    "chat.scroll-to-message",
  );
};
