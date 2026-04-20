import { useMutation } from "@tanstack/react-query";
import i18n from "@/i18n/config";
import {
  MessageType,
  sendChatMessage,
  type SendChatMessageOptions,
} from "@/api";
import { QUERY_KEY } from "./use-chat-messages";

export { MessageType };
export type {
  ChatCharacterData,
  ChatNpc,
  PartyGatheringChatData,
  SendChatMessageOptions,
} from "@/api";

export const useSendChatMessage = () => {
  const mutation = useMutation({
    mutationKey: [QUERY_KEY],
    mutationFn: (options: SendChatMessageOptions) => sendChatMessage(options),
    onError: (error) => {
      console.error("Chat message error:", error);
      window.message(i18n.t("chat.errors.sendMessage"));
    },
  });

  return mutation;
};
