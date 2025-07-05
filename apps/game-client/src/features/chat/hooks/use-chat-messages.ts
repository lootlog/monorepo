import { GatewayEvent } from "@/config/gateway";
import { ChatMessage, QUERY_KEY } from "@/hooks/api/use-chat-messages";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useEffect, useRef } from "react";

export const useChatMessagesListener = (selectedGuildId: string) => {
  const queryClient = useQueryClient();
  const { socket, connected } = useGateway();

  const selectedGuildIdRef = useRef("");
  selectedGuildIdRef.current = selectedGuildId;

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    socket?.on(GatewayEvent.CHAT_MESSAGE, (data: ChatMessage) => {
      if (!selectedGuildIdRef.current) return;

      queryClient.setQueryData(
        [QUERY_KEY, selectedGuildIdRef.current],
        (old: AxiosResponse<ChatMessage[]>) => {
          if (data.guildId !== selectedGuildIdRef.current) return old;

          return {
            data: [...old.data, data],
          };
        }
      );
    });
  }, [connected, selectedGuildId]);
};
