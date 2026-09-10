import { GatewayEvent } from "@/config/gateway";
import { resolveNpcType } from "@lootlog/domain/npc-routing";
import type { NpcTypeEnum } from "@lootlog/schema/npc-type";
import type { PermissionsUpdatedPayload } from "@/lib/socket";
import {
  applyChatAccessPolicy,
  retainChatAccessPolicy,
} from "../chat-access-policy";
import type { ChatMessage } from "@/api/chat.api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/contexts/socket-context";
import {
  getGuildMembersSummaryQueryKey,
  getGuildMembersSummaryQueryOptions,
} from "@/hooks/api/guild-members-summary-query";
import {
  getMembersControllerGetMeQueryKey,
  membersControllerGetMe,
} from "@lootlog/client/main";
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
} from "@/features/chat/chat-query-cache.helpers";
import { createChatCacheBatcher } from "@/features/chat/chat-cache-batcher";

type MentionSourceNpc = { type: NpcTypeEnum; lvl: number };

/**
 * Resolves the NPC a mention originates from. Returns "skip" when the message
 * carries malformed NPC data or its rank is hidden in chat.
 */
const resolveMentionSourceNpc = (
  data: ChatMessage,
  hiddenNpcTypes: ReadonlySet<NpcTypeEnum> | undefined,
): MentionSourceNpc | undefined | "skip" => {
  if (data.type !== "NPC" && !(data.type === "PARTY_GATHERING" && data.npc)) {
    return undefined;
  }

  const type = resolveNpcType(data.npc);

  if (!type || !data.npc || !Number.isFinite(data.npc.lvl) || data.npc.lvl < 0)
    return "skip";

  if (data.type === "NPC" && hiddenNpcTypes?.has(type)) return "skip";

  return { type, lvl: data.npc.lvl };
};

type UseChatMessagesListenerOptions = {
  onRemoteMessage?: (data: ChatMessage) => void;
  prefetchMembers?: boolean;
  hiddenNpcTypes?: ReadonlySet<NpcTypeEnum>;
};

export const useChatMessagesListener = (
  options?: UseChatMessagesListenerOptions,
) => {
  const queryClient = useQueryClient();
  const { connected, joined, joinedGuilds, socket } = useSocket();
  const { data: sessionData } = useSession();
  const { presentNotifications } = useNotificationPresenter();

  const [chatCacheBatcher] = useState(() =>
    createChatCacheBatcher(queryClient),
  );

  const runtimeAccountId = useGameStore(
    (state) => state.game?.hero.accountId ?? "",
  );

  const runtimeHeroName = useGameStore((state) => state.game?.hero.name ?? "");
  const runtimeWorld = useGameStore((state) => state.game?.world ?? "");

  const runtimeIdentityRef = useRef({
    accountId: runtimeAccountId,
    heroName: runtimeHeroName,
    world: runtimeWorld,
  });

  const sessionDiscordIdRef = useRef(sessionData?.user?.discordId);
  const onRemoteMessageRef = useRef(options?.onRemoteMessage);
  const hiddenNpcTypesRef = useRef(options?.hiddenNpcTypes);
  const wasJoinedRef = useRef(joined);
  const permissionGenerationRef = useRef(0);
  const guildPermissionGenerationsRef = useRef(new Map<string, number>());
  useEffect(() => retainChatAccessPolicy(queryClient), [queryClient]);
  const accountCacheIdentity = `${sessionData?.user?.discordId ?? ""}\u0000${runtimeAccountId}`;
  const previousAccountCacheIdentityRef = useRef(accountCacheIdentity);
  useEffect(
    () => () => {
      chatCacheBatcher.flush();
    },
    [chatCacheBatcher],
  );
  useEffect(() => {
    sessionDiscordIdRef.current = sessionData?.user?.discordId;
    runtimeIdentityRef.current = {
      accountId: runtimeAccountId,
      heroName: runtimeHeroName,
      world: runtimeWorld,
    };
    onRemoteMessageRef.current = options?.onRemoteMessage;
    hiddenNpcTypesRef.current = options?.hiddenNpcTypes;
  }, [
    options?.hiddenNpcTypes,
    options?.onRemoteMessage,
    runtimeAccountId,
    runtimeHeroName,
    runtimeWorld,
    sessionData?.user?.discordId,
  ]);

  useEffect(() => {
    if (joined && !wasJoinedRef.current && !socket?.getAccessPolicy?.()) {
      void invalidateChatMessagesQueries(queryClient);
    }

    wasJoinedRef.current = joined;
  }, [joined, queryClient, socket]);

  useEffect(() => {
    if (previousAccountCacheIdentityRef.current !== accountCacheIdentity) {
      chatCacheBatcher.discardAll();
      removeAllChatMessagesQueries(queryClient);
      previousAccountCacheIdentityRef.current = accountCacheIdentity;
    }
  }, [accountCacheIdentity, chatCacheBatcher, queryClient]);

  useEffect(() => {
    if (!joined) {
      return;
    }

    chatCacheBatcher.discardOutsideGuilds(joinedGuilds);
    removeChatMessagesQueriesOutsideGuilds(queryClient, joinedGuilds);
  }, [chatCacheBatcher, joined, joinedGuilds, queryClient]);

  useEffect(() => {
    const discardAllPending = () => {
      permissionGenerationRef.current += 1;
      chatCacheBatcher.discardAll();
    };

    const handlePermissionsUpdated = (data: PermissionsUpdatedPayload) => {
      if (!data.accessPolicy) {
        discardAllPending();

        return;
      }

      const guildIds = (data.changes ?? []).flatMap((change) =>
        change.restricted && change.areas.includes("chat")
          ? [change.organizationId]
          : [],
      );

      for (const guildId of guildIds) {
        guildPermissionGenerationsRef.current.set(
          guildId,
          (guildPermissionGenerationsRef.current.get(guildId) ?? 0) + 1,
        );
      }

      chatCacheBatcher.discardGuilds(guildIds);
      applyChatAccessPolicy(queryClient, data.accessPolicy);
    };

    socket?.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    socket?.on(GatewayEvent.DISCONNECT, discardAllPending);
    const currentPolicy = socket?.getAccessPolicy?.();

    if (currentPolicy) applyChatAccessPolicy(queryClient, currentPolicy);

    return () => {
      socket?.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
      socket?.off(GatewayEvent.DISCONNECT, discardAllPending);
    };
  }, [chatCacheBatcher, queryClient, socket]);

  const handlerRef = useRef<
    (data: ChatMessage, afterFlush?: () => void) => void
  >(() => undefined);

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
    handlerRef.current = (data, afterFlush) => {
      chatCacheBatcher.enqueue({ kind: "create", message: data }, afterFlush);

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
      const permissionGeneration = permissionGenerationRef.current;

      const guildGeneration =
        guildPermissionGenerationsRef.current.get(data.guildId) ?? 0;

      try {
        if (!data.message || !hasChatMentionToken(data.message)) return;

        if (
          data.senderId === sessionDiscordIdRef.current ||
          data.characterData.nick === runtimeIdentityRef.current.heroName
        ) {
          return;
        }

        const sourceNpc = resolveMentionSourceNpc(
          data,
          hiddenNpcTypesRef.current,
        );

        if (sourceNpc === "skip") return;

        const currentMember = await queryClient.fetchQuery({
          queryKey: getMembersControllerGetMeQueryKey({
            guildId: data.guildId,
          }),
          queryFn: () => membersControllerGetMe({ guildId: data.guildId }),
          staleTime: 5 * 60 * 1000,
        });

        if (
          permissionGeneration !== permissionGenerationRef.current ||
          guildGeneration !==
            (guildPermissionGenerationsRef.current.get(data.guildId) ?? 0)
        )
          return;

        const currentUserNames = getCurrentUserMentionNames({
          currentCharacterNick: runtimeIdentityRef.current.heroName,
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
              sourceNpc: sourceNpc ?? null,
              notificationId: getChatMentionNotificationId({
                guildId: data.guildId,
                messageId: data.id,
              }),
              discordId: data.senderId,
              guildId: data.guildId,
              world: runtimeIdentityRef.current.world,
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
      chatCacheBatcher.enqueue({
        guildId: data.guildId,
        kind: "delete",
        messageId: data.messageId,
      });
    };

    updateHandlerRef.current = (data) => {
      chatCacheBatcher.enqueue({
        guildId: data.guildId,
        kind: "update",
        message: data.message,
        messageId: data.messageId,
      });
    };

    clearHandlerRef.current = (data) => {
      chatCacheBatcher.enqueue({
        guildId: data.guildId,
        kind: "clear",
      });
    };
  }, [
    chatCacheBatcher,
    options?.prefetchMembers,
    presentNotifications,
    queryClient,
  ]);

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    const onChatMessage = (data: ChatMessage) => {
      const isRemoteMessage =
        data.senderId !== sessionDiscordIdRef.current &&
        data.characterData.nick !== runtimeIdentityRef.current.heroName;

      handlerRef.current(
        data,
        isRemoteMessage ? () => onRemoteMessageRef.current?.(data) : undefined,
      );

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
