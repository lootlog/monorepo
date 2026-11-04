import { resolveNpcType } from "@lootlog/domain/npc-routing";
import type { NpcTypeEnum } from "@lootlog/schema/npc-type";
import type { AccessUpdate } from "@/lib/socket";
import type { ChatMessage } from "@/api/chat.api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSocket } from "@/contexts/socket-context";
import { getGuildMembersSummaryQueryOptions } from "@/hooks/api/guild-members-summary-query";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
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

export const useChatMessagesListener = ({
  onRemoteMessage,
  prefetchMembers = false,
  hiddenNpcTypes,
}: UseChatMessagesListenerOptions = {}) => {
  const queryClient = useQueryClient();
  const { connected, joined, joinedGuilds, socket } = useSocket();
  const { data: sessionData, isPending: isSessionPending } = useSession();
  const { presentNotifications } = useNotificationPresenter();

  const [chatCacheBatcher] = useState(() =>
    createChatCacheBatcher(queryClient),
  );

  const runtimeAccountId = useGameStore(
    (state) => state.game?.hero.accountId ?? "",
  );

  const runtimeHeroName = useGameStore((state) => state.game?.hero.name ?? "");
  const runtimeWorld = useGameStore((state) => state.game?.world ?? "");
  const discordId = sessionData?.user?.discordId;
  // Bumped by permission changes, so a mention resolved across one is dropped.
  const permissionGenerationRef = useRef(0);
  const guildPermissionGenerationsRef = useRef(new Map<string, number>());

  const previousAccountCacheIdentityRef = useRef({
    accountId: runtimeAccountId,
    discordId,
    sessionResolved: !isSessionPending,
  });

  useEffect(
    () => () => {
      chatCacheBatcher.flush();
    },
    [chatCacheBatcher],
  );

  useEffect(() => {
    const previous = previousAccountCacheIdentityRef.current;
    const sessionResolved = !isSessionPending;
    const accountChanged = previous.accountId !== runtimeAccountId;

    const sessionChanged =
      previous.sessionResolved &&
      sessionResolved &&
      previous.discordId !== discordId;

    if (accountChanged || sessionChanged) {
      chatCacheBatcher.discardAll();
      removeAllChatMessagesQueries(queryClient);
    }

    previousAccountCacheIdentityRef.current = {
      accountId: runtimeAccountId,
      discordId: sessionResolved ? discordId : previous.discordId,
      sessionResolved: previous.sessionResolved || sessionResolved,
    };
  }, [
    runtimeAccountId,
    discordId,
    isSessionPending,
    chatCacheBatcher,
    queryClient,
  ]);

  useEffect(() => {
    if (!joined) {
      return;
    }

    chatCacheBatcher.discardOutsideGuilds(joinedGuilds);
    removeChatMessagesQueriesOutsideGuilds(queryClient, joinedGuilds);
  }, [chatCacheBatcher, joined, joinedGuilds, queryClient]);

  // The SocketProvider applies the access policy to cached histories; this
  // only drops what is queued and not yet published.
  useEffect(() => {
    const discardAllPending = () => {
      permissionGenerationRef.current += 1;
      chatCacheBatcher.discardAll();
    };

    const handlePermissionsUpdated = (data: AccessUpdate) => {
      const guildIds = data.changes.flatMap((change) =>
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
    };

    socket?.on("access.updated", handlePermissionsUpdated);
    socket?.on("disconnect", discardAllPending);

    return () => {
      socket?.off("access.updated", handlePermissionsUpdated);
      socket?.off("disconnect", discardAllPending);
    };
  }, [chatCacheBatcher, socket]);

  const isOwnMessage = (data: ChatMessage) =>
    data.senderId === discordId || data.characterData.nick === runtimeHeroName;

  const presentMention = useEffectEvent(async (data: ChatMessage) => {
    const permissionGeneration = permissionGenerationRef.current;

    const guildGeneration =
      guildPermissionGenerationsRef.current.get(data.guildId) ?? 0;

    try {
      if (!data.message || !hasChatMentionToken(data.message)) return;

      if (isOwnMessage(data)) return;

      const sourceNpc = resolveMentionSourceNpc(data, hiddenNpcTypes);

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
        currentCharacterNick: runtimeHeroName,
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
            world: runtimeWorld,
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
  });

  const onChatMessage = useEffectEvent((data: ChatMessage) => {
    chatCacheBatcher.enqueue(
      { kind: "create", message: data },
      isOwnMessage(data) ? undefined : () => onRemoteMessage?.(data),
    );

    if (
      prefetchMembers &&
      !queryClient.getQueryData(
        getMembersControllerGetGuildMembersSummaryQueryKey({
          guildId: data.guildId,
        }),
      )
    ) {
      void queryClient.prefetchQuery(
        getGuildMembersSummaryQueryOptions({ guildId: data.guildId }),
      );
    }

    void presentMention(data);
  });

  useEffect(() => {
    if (!socket || !connected) return;

    const onCreated = (data: ChatMessage) => onChatMessage(data);

    const onDeleted = ({
      guildId,
      messageId,
    }: {
      guildId: string;
      messageId: string;
    }) => chatCacheBatcher.enqueue({ kind: "delete", guildId, messageId });

    const onUpdated = ({
      guildId,
      messageId,
      message,
    }: {
      guildId: string;
      messageId: string;
      message: string;
    }) =>
      chatCacheBatcher.enqueue({ kind: "update", guildId, messageId, message });

    const onCleared = ({ guildId }: { guildId: string }) =>
      chatCacheBatcher.enqueue({ kind: "clear", guildId });

    socket.on("chat.created", onCreated);
    socket.on("chat.deleted", onDeleted);
    socket.on("chat.updated", onUpdated);
    socket.on("chat.cleared", onCleared);

    return () => {
      socket.off("chat.created", onCreated);
      socket.off("chat.deleted", onDeleted);
      socket.off("chat.updated", onUpdated);
      socket.off("chat.cleared", onCleared);
    };
  }, [chatCacheBatcher, connected, socket]);
};
