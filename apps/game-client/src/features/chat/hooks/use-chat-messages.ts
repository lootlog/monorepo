import { GatewayEvent } from "@/config/gateway";
import { ChatMessage, fetchChatMessages } from "@/hooks/api/use-chat-messages";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance, AxiosResponse } from "axios";
import { useEffect } from "react";
import { useChatCache } from "./use-chat-cache";
import { fetchGuildMembers } from "@/hooks/api/use-guild-members";

export const useChatMessagesListener = (client: AxiosInstance) => {
  const queryClient = useQueryClient();
  const { socket, connected } = useGateway();

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    socket?.on(GatewayEvent.CHAT_MESSAGE, (data: ChatMessage) => {
      queryClient.setQueryData(
        ["channel-messages", data.guildId],
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
    });
  }, [connected, socket, queryClient]);
};
