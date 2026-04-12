import { GatewayEvent } from "@/config/gateway";
import {
  type ChatMessage,
  fetchChatMessages,
  QUERY_KEY,
} from "@/hooks/api/use-chat-messages";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance, AxiosResponse } from "axios";
import { useCallback, useEffect, useRef } from "react";
import { useChatCache } from "./use-chat-cache";
import { fetchGuildMembers } from "@/hooks/api/use-guild-members";
import { useSocket } from "@/contexts/socket-context";

export const useChatMessagesListener = (client: AxiosInstance) => {
  const queryClient = useQueryClient();
  const { connected, socket } = useSocket();

  const handleChatMessage = useCallback(
    (data: ChatMessage) => {
      queryClient.setQueryData(
        [QUERY_KEY, data.guildId],
        (old: AxiosResponse<ChatMessage[]>) => {
          if (!old) return { data: [data] };

          return {
            data: [...old.data, data],
          };
        },
      );
      const cache = useChatCache.getState();
      if (!cache.messageCache[data.guildId]) {
        fetchChatMessages(client, data.guildId).then((messages) => {
          if (messages.length) {
            useChatCache.getState().setMessageCache(data.guildId, messages);
          }
        });
      }
      if (!cache.memberCache[data.guildId]) {
        fetchGuildMembers(client, data.guildId).then((members) => {
          if (members) {
            useChatCache.getState().setMemberCache(data.guildId, members);
          }
        });
      }
      cache.appendMessage(data.guildId, data);
    },
    [queryClient, client],
  );

  const handleChatMessageDelete = useCallback(
    (data: { guildId: string; messageId: string }) => {
      queryClient.setQueryData(
        [QUERY_KEY, data.guildId],
        (old: AxiosResponse<ChatMessage[]>) => {
          if (!old) return old;

          return {
            data: old.data.filter((m) => m.id !== data.messageId),
          };
        },
      );
      useChatCache.getState().removeMessage(data.guildId, data.messageId);
    },
    [queryClient],
  );

  const handleChatMessageUpdate = useCallback(
    (data: { guildId: string; messageId: string; message: string }) => {
      queryClient.setQueryData(
        [QUERY_KEY, data.guildId],
        (old: AxiosResponse<ChatMessage[]>) => {
          if (!old) return old;

          return {
            data: old.data.map((m) =>
              m.id === data.messageId
                ? { ...m, message: data.message, partyGathering: undefined }
                : m,
            ),
          };
        },
      );
      useChatCache
        .getState()
        .updateMessage(data.guildId, data.messageId, data.message);
    },
    [queryClient],
  );

  const handlerRef = useRef(handleChatMessage);
  handlerRef.current = handleChatMessage;

  const deleteHandlerRef = useRef(handleChatMessageDelete);
  deleteHandlerRef.current = handleChatMessageDelete;

  const updateHandlerRef = useRef(handleChatMessageUpdate);
  updateHandlerRef.current = handleChatMessageUpdate;

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    const onChatMessage = (data: ChatMessage) => handlerRef.current(data);

    socket?.on(GatewayEvent.CHAT_MESSAGE, onChatMessage);

    return () => {
      socket?.off(GatewayEvent.CHAT_MESSAGE, onChatMessage);
    };
  }, [connected, socket]);

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE_DELETE) || !connected)
      return;

    const onChatMessageDelete = (data: {
      guildId: string;
      messageId: string;
    }) => deleteHandlerRef.current(data);

    socket?.on(GatewayEvent.CHAT_MESSAGE_DELETE, onChatMessageDelete);

    return () => {
      socket?.off(GatewayEvent.CHAT_MESSAGE_DELETE, onChatMessageDelete);
    };
  }, [connected, socket]);

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE_UPDATE) || !connected)
      return;

    const onChatMessageUpdate = (data: {
      guildId: string;
      messageId: string;
      message: string;
    }) => updateHandlerRef.current(data);

    socket?.on(GatewayEvent.CHAT_MESSAGE_UPDATE, onChatMessageUpdate);

    return () => {
      socket?.off(GatewayEvent.CHAT_MESSAGE_UPDATE, onChatMessageUpdate);
    };
  }, [connected, socket]);
};
