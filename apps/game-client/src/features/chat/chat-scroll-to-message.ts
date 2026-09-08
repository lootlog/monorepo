const CHAT_SCROLL_TO_MESSAGE_EVENT = "lootlog:chat-scroll-to-message";

export type ChatScrollToMessageEvent = CustomEvent<{ messageId: string }>;

declare global {
  interface WindowEventMap {
    "lootlog:chat-scroll-to-message": ChatScrollToMessageEvent;
  }
}

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
  const eventListener = (event: ChatScrollToMessageEvent) => listener(event);

  window.addEventListener(CHAT_SCROLL_TO_MESSAGE_EVENT, eventListener);
  return () =>
    window.removeEventListener(CHAT_SCROLL_TO_MESSAGE_EVENT, eventListener);
};
