import { GatewayEvent } from "@/config/gateway";
import { type ChatMessage, fetchChatMessages } from "@/api/chat.api";
import { fetchGuildMembers } from "@/api/guilds.api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useChatCache } from "./use-chat-cache";
import { useSocket } from "@/contexts/socket-context";
import { getChatControllerGetChatMessagesQueryKey } from "@/lib/api/generated/main/chat/chat";

export const useChatMessagesListener = () => {
  const queryClient = useQueryClient();
  const { connected, socket } = useSocket();

  const handleChatMessage = useCallback(
    (data: ChatMessage) => {
      queryClient.setQueryData(
        getChatControllerGetChatMessagesQueryKey({ guildId: data.guildId }),
        (old: ChatMessage[]) => {
          if (!old) return [data];

          return [...old, data];
        },
      );
      if (!useChatCache.getState().messageCache[data.guildId]) {
        fetchChatMessages(data.guildId)
          .then((messages) => {
            if (messages.length) {
              useChatCache.getState().setMessageCache(data.guildId, messages);
            }
          })
          .catch(() => undefined);
      }
      if (!useChatCache.getState().memberCache[data.guildId]) {
        fetchGuildMembers(data.guildId)
          .then((members) => {
            if (members) {
              useChatCache.getState().setMemberCache(data.guildId, members);
            }
          })
          .catch(() => undefined);
      }
      useChatCache.getState().appendMessage(data.guildId, data);
    },
    [queryClient],
  );

  const handleChatMessageDelete = useCallback(
    (data: { guildId: string; messageId: string }) => {
      queryClient.setQueryData(
        getChatControllerGetChatMessagesQueryKey({ guildId: data.guildId }),
        (old: ChatMessage[]) => {
          if (!old) return old;

          return old.filter((message) => message.id !== data.messageId);
        },
      );
      useChatCache.getState().removeMessage(data.guildId, data.messageId);
    },
    [queryClient],
  );

  const handleChatMessageUpdate = useCallback(
    (data: { guildId: string; messageId: string; message: string }) => {
      queryClient.setQueryData(
        getChatControllerGetChatMessagesQueryKey({ guildId: data.guildId }),
        (old: ChatMessage[]) => {
          if (!old) return old;

          return old.map((message) =>
            message.id === data.messageId
              ? { ...message, message: data.message, partyGathering: undefined }
              : message,
          );
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
