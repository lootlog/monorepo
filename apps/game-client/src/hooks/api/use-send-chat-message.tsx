import { useMutation } from "@tanstack/react-query";
import {
  MessageType,
  sendChatMessage,
  type SendChatMessageOptions,
} from "@/api";
import { getFixedT } from "@/i18n/get-fixed-t";
import { QUERY_KEY } from "./use-chat-messages";

export { MessageType };
export type {
  ChatCharacterData,
  ChatNpc,
  PartyGatheringChatData,
  SendChatMessageOptions,
} from "@/api";

export const useSendChatMessage = () => {
  const t = getFixedT("chat");
  const mutation = useMutation({
    mutationKey: [QUERY_KEY],
    mutationFn: (options: SendChatMessageOptions) => sendChatMessage(options),
    onError: (error) => {
      console.error("Chat message error:", error);
      window.message(t("errors.sendFailed"));
    },
  });

  return mutation;
};
