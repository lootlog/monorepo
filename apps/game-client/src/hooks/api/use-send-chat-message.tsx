import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, type SendChatMessageOptions } from "@/api/chat.api";
import { getFixedT } from "@/i18n/get-fixed-t";
import { getChatControllerSendChatMessageMutationOptions } from "@/lib/api/generated/main/chat/chat";

export const useSendChatMessage = () => {
  const t = getFixedT("chat");
  const { mutationKey } = getChatControllerSendChatMessageMutationOptions();
  const mutation = useMutation({
    mutationKey,
    mutationFn: (options: SendChatMessageOptions) => sendChatMessage(options),
    onError: (error) => {
      console.warn("Chat message error:", error);
      showRuntimeMessage(t("errors.sendFailed"));
    },
  });

  return mutation;
};
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
