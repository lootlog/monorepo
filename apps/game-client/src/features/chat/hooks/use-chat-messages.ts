import { GatewayEvent } from "@/config/gateway";
import type { ChatMessage } from "@/api/chat.api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSocket } from "@/contexts/socket-context";
import { getChatControllerGetChatMessagesQueryKey } from "@/lib/api/generated/main/chat/chat";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
  membersControllerGetGuildMembersSummary,
} from "@/lib/api/generated/main/members/members";
import {
  removeChatMessage,
  updateChatMessage,
  upsertChatMessage,
} from "@/features/chat/chat.helpers";

export const useChatMessagesListener = () => {
  const queryClient = useQueryClient();
  const { connected, socket } = useSocket();

  const handlerRef = useRef<(data: ChatMessage) => void>(() => undefined);
  handlerRef.current = (data) => {
    queryClient.setQueryData(
      getChatControllerGetChatMessagesQueryKey({ guildId: data.guildId }),
      (old: ChatMessage[] | undefined) => upsertChatMessage(old, data),
    );

    const membersQueryKey = getMembersControllerGetGuildMembersSummaryQueryKey({
      guildId: data.guildId,
    });
    const cachedMembers = queryClient.getQueryData(membersQueryKey);

    if (!cachedMembers) {
      void queryClient.prefetchQuery({
        queryKey: membersQueryKey,
        queryFn: () =>
          membersControllerGetGuildMembersSummary({ guildId: data.guildId }),
        staleTime: 5 * 60 * 1000,
      });
    }
  };

  const deleteHandlerRef = useRef<
    (data: { guildId: string; messageId: string }) => void
  >(() => undefined);
  deleteHandlerRef.current = (data) => {
    queryClient.setQueryData(
      getChatControllerGetChatMessagesQueryKey({ guildId: data.guildId }),
      (old: ChatMessage[] | undefined) =>
        old ? removeChatMessage(old, data.messageId) : old,
    );
  };

  const updateHandlerRef = useRef<
    (data: { guildId: string; messageId: string; message: string }) => void
  >(() => undefined);
  updateHandlerRef.current = (data) => {
    queryClient.setQueryData(
      getChatControllerGetChatMessagesQueryKey({ guildId: data.guildId }),
      (old: ChatMessage[] | undefined) =>
        old ? updateChatMessage(old, data.messageId, data.message) : old,
    );
  };

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
