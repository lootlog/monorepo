import { GatewayEvent } from "@/config/gateway";
import type { ChatMessage } from "@/api/chat.api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSocket } from "@/contexts/socket-context";
import { getChatControllerGetChatMessagesQueryKey } from "@/lib/api/generated/main/chat/chat";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
  getMembersControllerGetMeQueryKey,
  membersControllerGetMe,
  membersControllerGetGuildMembersSummary,
} from "@/lib/api/generated/main/members/members";
import {
  removeChatMessage,
  updateChatMessage,
  upsertChatMessage,
} from "@/features/chat/chat.helpers";
import {
  getChatMentionNotificationId,
  getCurrentUserMentionNames,
  getCurrentUserMentionRoleNames,
  hasChatMentionToken,
  hasCurrentUserMention,
} from "@/features/chat/chat-mentions.helpers";
import { useSession } from "@/hooks/auth/use-session";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";

export const useChatMessagesListener = () => {
  const queryClient = useQueryClient();
  const { connected, socket } = useSocket();
  const { data: sessionData } = useSession();
  const pushNotification = useNotificationsStore(
    (state) => state.pushNotification,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const sessionDiscordIdRef = useRef(sessionData?.user?.discordId);
  sessionDiscordIdRef.current = sessionData?.user?.discordId;

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
  const mentionNotificationRef = useRef<
    (data: ChatMessage) => void | Promise<void>
  >(() => undefined);
  mentionNotificationRef.current = async (data) => {
    try {
      if (!data.message || !hasChatMentionToken(data.message)) {
        return;
      }

      if (
        data.senderId === sessionDiscordIdRef.current ||
        data.characterData.nick === Game.hero.nick
      ) {
        return;
      }

      const currentMember = await queryClient.fetchQuery({
        queryKey: getMembersControllerGetMeQueryKey({ guildId: data.guildId }),
        queryFn: () => membersControllerGetMe({ guildId: data.guildId }),
        staleTime: 5 * 60 * 1000,
      });
      const currentUserNames = getCurrentUserMentionNames({
        currentCharacterNick: Game.hero.nick,
        currentMember,
      });
      const currentUserRoleNames =
        getCurrentUserMentionRoleNames(currentMember);

      if (
        !hasCurrentUserMention(data.message, {
          currentUserNames,
          currentUserRoleNames,
        })
      ) {
        return;
      }

      setOpen("notifications", true);
      pushNotification({
        type: "chat-mention",
        notificationId: getChatMentionNotificationId({
          guildId: data.guildId,
          messageId: data.id,
        }),
        discordId: data.senderId,
        guildId: data.guildId,
        world: Game.getWorldName() ?? "",
        createdAt: data.timestamp,
        message: data.message,
        servers: [data.guildId],
      });
    } catch {
      return;
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

    const onChatMessage = (data: ChatMessage) => {
      handlerRef.current(data);
      void mentionNotificationRef.current(data);
    };

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
