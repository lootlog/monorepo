import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, type SendChatMessageOptions } from "@/api/chat.api";
import { getChatControllerSendChatMessageMutationOptions } from "@lootlog/client/main";

/** Callers report a failure once, in the context of the action that sent it. */
export const useSendChatMessage = () => {
  const { mutationKey } = getChatControllerSendChatMessageMutationOptions();

  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation -- useChatMessages applies authoritative CHAT_MESSAGE socket events to the shared query cache.
  return useMutation({
    mutationKey,
    mutationFn: (options: SendChatMessageOptions) => sendChatMessage(options),
  });
};
