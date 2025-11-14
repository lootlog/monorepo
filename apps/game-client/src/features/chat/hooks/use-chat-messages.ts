import { GatewayEvent } from "@/config/gateway";
import {
  type ChatMessage,
  fetchChatMessages,
  QUERY_KEY,
} from "@/hooks/api/use-chat-messages";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance, AxiosResponse } from "axios";
import { useCallback, useEffect, useRef } from "react";
import { useChatCache } from "./use-chat-cache";
import { fetchGuildMembers } from "@/hooks/api/use-guild-members";

export const useChatMessagesListener = (client: AxiosInstance) => {
  const queryClient = useQueryClient();
  const { socket, connected } = useGateway();

  const handleChatMessage = useCallback(
    (data: ChatMessage) => {
      queryClient.setQueryData(
        [QUERY_KEY, data.guildId],
        (old: AxiosResponse<ChatMessage[]>) => {
          return {
            data: [...old.data, data],
          };
        },
      );
      if (!useChatCache.getState().messageCache[data.guildId]) {
        fetchChatMessages(client, data.guildId).then((messages) => {
          if (messages.length) {
            useChatCache.getState().setMessageCache(data.guildId, messages);
          }
        });
      }
      if (!useChatCache.getState().memberCache[data.guildId]) {
        fetchGuildMembers(client, data.guildId).then((members) => {
          if (members) {
            useChatCache.getState().setMemberCache(data.guildId, members);
          }
        });
      }
      useChatCache.getState().appendMessage(data.guildId, data);
    },
    [queryClient, client],
  );

  const handlerRef = useRef(handleChatMessage);
  handlerRef.current = handleChatMessage;

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    const onChatMessage = (data: ChatMessage) => handlerRef.current(data);

    socket?.on(GatewayEvent.CHAT_MESSAGE, onChatMessage);

    return () => {
      socket?.off(GatewayEvent.CHAT_MESSAGE, onChatMessage);
    };
  }, [connected, socket]);
};
