const CHAT_SCROLL_TO_MESSAGE_EVENT = "lootlog:chat-scroll-to-message";

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

  window.addEventListener(CHAT_SCROLL_TO_MESSAGE_EVENT, eventListener);
  return () =>
    window.removeEventListener(CHAT_SCROLL_TO_MESSAGE_EVENT, eventListener);
};
