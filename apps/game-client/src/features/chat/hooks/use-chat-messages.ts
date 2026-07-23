import { GatewayEvent } from "@/config/gateway";
import type { ChatMessage } from "@/api/chat.api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSocket } from "@/contexts/socket-context";
import {
  getGuildMembersSummaryQueryKey,
  getGuildMembersSummaryQueryOptions,
} from "@/hooks/api/guild-members-summary-query";
import {
  getMembersControllerGetMeQueryKey,
  membersControllerGetMe,
} from "@lootlog/api-client/react-query/main/members";
import {
  removeChatMessage,
  updateChatMessage,
  upsertChatMessage,
} from "@/features/chat/chat.helpers";
import { useNotificationPresenter } from "@/features/notifications/hooks/use-notification-presenter";
import {
  getChatMentionNotificationId,
  getCurrentUserMentionNames,
  getCurrentUserMentionRoleNames,
  hasChatMentionToken,
  hasCurrentUserMention,
} from "@/features/chat/chat-mentions.helpers";
import { useSession } from "@/hooks/auth/use-session";
import { useGameStore } from "@/store/game.store";
import {
  invalidateChatMessagesQueries,
  removeAllChatMessagesQueries,
  removeChatMessagesQueriesOutsideGuilds,
  updateChatMessagesCache,
} from "@/features/chat/chat-query-cache.helpers";

type UseChatMessagesListenerOptions = {
  onRemoteMessage?: (data: ChatMessage) => void;
  prefetchMembers?: boolean;
};

export const useChatMessagesListener = (
  options?: UseChatMessagesListenerOptions,
) => {
  const queryClient = useQueryClient();
  const { connected, joined, joinedGuilds, socket } = useSocket();
  const { data: sessionData } = useSession();
  const { presentNotifications } = useNotificationPresenter();
  const runtimeGame = useGameStore((state) => state.game);
  const runtimeGameRef = useRef(runtimeGame);
  const sessionDiscordIdRef = useRef(sessionData?.user?.discordId);
  const onRemoteMessageRef = useRef(options?.onRemoteMessage);
  const wasConnectedRef = useRef(connected);
  const accountCacheIdentity = `${sessionData?.user?.discordId ?? ""}\u0000${runtimeGame?.hero.accountId ?? ""}`;
  const previousAccountCacheIdentityRef = useRef(accountCacheIdentity);
  useEffect(() => {
    sessionDiscordIdRef.current = sessionData?.user?.discordId;
    runtimeGameRef.current = runtimeGame;
    onRemoteMessageRef.current = options?.onRemoteMessage;
  }, [options?.onRemoteMessage, runtimeGame, sessionData?.user?.discordId]);

  useEffect(() => {
    if (connected && !wasConnectedRef.current) {
      void invalidateChatMessagesQueries(queryClient);
    }

    wasConnectedRef.current = connected;
  }, [connected, queryClient]);

  useEffect(() => {
    if (previousAccountCacheIdentityRef.current !== accountCacheIdentity) {
      removeAllChatMessagesQueries(queryClient);
      previousAccountCacheIdentityRef.current = accountCacheIdentity;
    }
  }, [accountCacheIdentity, queryClient]);

  useEffect(() => {
    if (!joined) {
      return;
    }

    removeChatMessagesQueriesOutsideGuilds(queryClient, joinedGuilds);
  }, [joined, joinedGuilds, queryClient]);

  const handlerRef = useRef<(data: ChatMessage) => void>(() => undefined);
  const mentionNotificationRef = useRef<
    (data: ChatMessage) => void | Promise<void>
  >(() => undefined);
  const deleteHandlerRef = useRef<
    (data: { guildId: string; messageId: string }) => void
  >(() => undefined);
  const updateHandlerRef = useRef<
    (data: { guildId: string; messageId: string; message: string }) => void
  >(() => undefined);
  const clearHandlerRef = useRef<(data: { guildId: string }) => void>(
    () => undefined,
  );

  useEffect(() => {
    handlerRef.current = (data) => {
      updateChatMessagesCache({
        guildId: data.guildId,
        queryClient,
        updater: (old: ChatMessage[] | undefined) =>
          upsertChatMessage(old, data),
      });

      if (!options?.prefetchMembers) {
        return;
      }

      const membersQueryKey = getGuildMembersSummaryQueryKey({
        guildId: data.guildId,
      });
      const cachedMembers = queryClient.getQueryData(membersQueryKey);

      if (!cachedMembers) {
        void queryClient.prefetchQuery(
          getGuildMembersSummaryQueryOptions({
            guildId: data.guildId,
          }),
        );
      }
    };
    mentionNotificationRef.current = async (data) => {
      try {
        if (!data.message || !hasChatMentionToken(data.message)) return;
        if (
          data.senderId === sessionDiscordIdRef.current ||
          data.characterData.nick === runtimeGameRef.current?.hero.name
        ) {
          return;
        }

        const currentMember = await queryClient.fetchQuery({
          queryKey: getMembersControllerGetMeQueryKey({
            guildId: data.guildId,
          }),
          queryFn: () => membersControllerGetMe({ guildId: data.guildId }),
          staleTime: 5 * 60 * 1000,
        });
        const currentUserNames = getCurrentUserMentionNames({
          currentCharacterNick: runtimeGameRef.current?.hero.name ?? "",
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

        presentNotifications([
          {
            notification: {
              type: "chat-mention",
              notificationId: getChatMentionNotificationId({
                guildId: data.guildId,
                messageId: data.id,
              }),
              discordId: data.senderId,
              guildId: data.guildId,
              world: runtimeGameRef.current?.world ?? "",
              createdAt: data.timestamp,
              message: data.message,
              servers: [data.guildId],
            },
            playSound: false,
          },
        ]);
      } catch {
        // Mention resolution is best-effort and must not interrupt chat ingestion.
      }
    };
    deleteHandlerRef.current = (data) => {
      updateChatMessagesCache({
        guildId: data.guildId,
        queryClient,
        updater: (old: ChatMessage[] | undefined) =>
          old ? removeChatMessage(old, data.messageId) : old,
      });
    };
    updateHandlerRef.current = (data) => {
      updateChatMessagesCache({
        guildId: data.guildId,
        queryClient,
        updater: (old: ChatMessage[] | undefined) =>
          old ? updateChatMessage(old, data.messageId, data.message) : old,
      });
    };
    clearHandlerRef.current = (data) => {
      updateChatMessagesCache({
        guildId: data.guildId,
        queryClient,
        updater: [],
      });
    };
  }, [options?.prefetchMembers, presentNotifications, queryClient]);

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    const onChatMessage = (data: ChatMessage) => {
      handlerRef.current(data);

      if (
        data.senderId !== sessionDiscordIdRef.current &&
        data.characterData.nick !== runtimeGameRef.current?.hero.name
      ) {
        onRemoteMessageRef.current?.(data);
      }

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

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGES_CLEAR) || !connected)
      return;

    const onChatMessagesClear = (data: { guildId: string }) =>
      clearHandlerRef.current(data);

    socket?.on(GatewayEvent.CHAT_MESSAGES_CLEAR, onChatMessagesClear);

    return () => {
      socket?.off(GatewayEvent.CHAT_MESSAGES_CLEAR, onChatMessagesClear);
    };
  }, [connected, socket]);
};
