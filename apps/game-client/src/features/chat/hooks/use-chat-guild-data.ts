import { useQueries, useQueryClient } from "@tanstack/react-query";
import { CHAT_QUERY_GC_TIME_MS } from "@/features/chat/chat.constants";
import { mergeChatMessageHistories } from "@/features/chat/chat.helpers";
import { getGuildMembersSummaryQueryOptions } from "@/hooks/api/guild-members-summary-query";
import {
  chatControllerGetChatMessages,
  getChatControllerGetChatMessagesQueryKey,
} from "@lootlog/api-client/react-query/main/chat";
import {
  getMembersControllerGetMeQueryKey,
  membersControllerGetMe,
} from "@lootlog/api-client/react-query/main/members";
import {
  getRolesControllerGetGuildRolesQueryKey,
  rolesControllerGetGuildRoles,
} from "@lootlog/api-client/react-query/main/roles";
import {
  getGuildIds,
  mapGuildMembersByUserId,
  type GuildIdentity,
} from "@/lib/api/generated-helpers";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { MemberSummaryResponseDtoOutput as GuildMember } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import {
  buildChatMentionContext,
  hasChatMentionToken,
  type ChatMentionContext,
} from "@/features/chat/chat-mentions.helpers";
import type { AsyncResourceState } from "@/types/async-resource-state";

type UseChatGuildDataOptions = {
  currentCharacterNick: string;
  guilds?: GuildIdentity[];
  selectedGuildId?: string;
};

type ChatGuildData = {
  memberLookup: Record<string, GuildMember>;
  mentionContext: ChatMentionContext;
  messages: ChatMessageType[];
};

const getGuildIdsToLoad = (
  guildIds: string[],
  selectedGuildId: string | undefined,
) => {
  if (selectedGuildId === "all") return guildIds;
  if (!selectedGuildId) return [];
  return [selectedGuildId];
};

const reconcileChatMessageRefetch = ({
  cachedMessagesAfterRequest,
  cachedMessagesBeforeRequest,
  serverMessages,
}: {
  cachedMessagesAfterRequest?: ChatMessageType[];
  cachedMessagesBeforeRequest?: ChatMessageType[];
  serverMessages: ChatMessageType[];
}) => {
  const messagesBeforeRequestById = new Map(
    cachedMessagesBeforeRequest?.map((message) => [message.id, message]),
  );
  const messageIdsAfterRequest = new Set(
    cachedMessagesAfterRequest?.map((message) => message.id),
  );
  const removedMessageIds = new Set(
    cachedMessagesBeforeRequest
      ?.filter((message) => !messageIdsAfterRequest.has(message.id))
      .map((message) => message.id),
  );
  const messagesChangedDuringRequest =
    cachedMessagesAfterRequest?.filter(
      (message) => messagesBeforeRequestById.get(message.id) !== message,
    ) ?? [];

  return mergeChatMessageHistories(
    serverMessages.filter((message) => !removedMessageIds.has(message.id)),
    messagesChangedDuringRequest,
  );
};

export const useChatGuildData = ({
  currentCharacterNick,
  guilds,
  selectedGuildId,
}: UseChatGuildDataOptions) => {
  const queryClient = useQueryClient();
  const guildIds = getGuildIds(guilds);
  const guildIdsToLoad = getGuildIdsToLoad(guildIds, selectedGuildId);

  const messageQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => {
      const queryKey = getChatControllerGetChatMessagesQueryKey({ guildId });

      return {
        queryKey,
        queryFn: async ({ signal }) => {
          const cachedMessagesBeforeRequest =
            queryClient.getQueryData<ChatMessageType[]>(queryKey);
          const serverMessages = await chatControllerGetChatMessages(
            {
              guildId,
            },
            { signal },
          );
          const cachedMessagesAfterRequest =
            queryClient.getQueryData<ChatMessageType[]>(queryKey);

          return reconcileChatMessageRefetch({
            cachedMessagesAfterRequest,
            cachedMessagesBeforeRequest,
            serverMessages,
          });
        },
        enabled: Boolean(guildId),
        gcTime: CHAT_QUERY_GC_TIME_MS,
        staleTime: 5 * 60 * 1000,
      };
    }),
  });
  const memberQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) =>
      getGuildMembersSummaryQueryOptions({ guildId }),
    ),
  });
  const hasMentionCandidatesByGuildId = guildIdsToLoad.reduce<
    Record<string, boolean>
  >((result, guildId, index) => {
    const messages = (messageQueries[index]?.data ?? []) as ChatMessageType[];

    result[guildId] = messages.some((message) => {
      return hasChatMentionToken(message.message);
    });

    return result;
  }, {});
  const currentMemberQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getMembersControllerGetMeQueryKey({ guildId }),
      queryFn: () => membersControllerGetMe({ guildId }),
      enabled: Boolean(guildId) && hasMentionCandidatesByGuildId[guildId],
      gcTime: CHAT_QUERY_GC_TIME_MS,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const roleQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getRolesControllerGetGuildRolesQueryKey({ guildId }),
      queryFn: () => rolesControllerGetGuildRoles({ guildId }),
      enabled: Boolean(guildId) && hasMentionCandidatesByGuildId[guildId],
      gcTime: CHAT_QUERY_GC_TIME_MS,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const hasMessagesResponse = messageQueries.some(
    (query) => query.data !== undefined,
  );
  const failedGuildIds = guildIdsToLoad.filter(
    (_guildId, index) => messageQueries[index]?.isError,
  );
  const firstMessageError = messageQueries.find(
    (query) => query.isError,
  )?.error;
  const initialLoading =
    guildIdsToLoad.length > 0 &&
    !hasMessagesResponse &&
    messageQueries.some((query) => query.isPending || query.isFetching);
  const refreshing =
    hasMessagesResponse && messageQueries.some((query) => query.isFetching);

  const retryFailed = () => {
    messageQueries.forEach((query) => {
      if (query.isError) {
        void query.refetch();
      }
    });
  };
  const resourceState: AsyncResourceState = {
    error: hasMessagesResponse ? null : (firstMessageError ?? null),
    initialLoading,
    refreshing,
    retry: retryFailed,
    stale: false,
  };

  const guildDataById = guildIdsToLoad.reduce<Record<string, ChatGuildData>>(
    (result, guildId, index) => {
      const messages = (messageQueries[index]?.data ?? []) as ChatMessageType[];
      const members = (memberQueries[index]?.data ?? []) as GuildMember[];

      result[guildId] = {
        messages,
        memberLookup: mapGuildMembersByUserId(members),
        mentionContext: buildChatMentionContext({
          currentCharacterNick,
          currentMember: currentMemberQueries[index]?.data,
          members,
          messages,
          roles: roleQueries[index]?.data,
        }),
      };

      return result;
    },
    {},
  );

  const messagesByGuildId = Object.fromEntries(
    Object.entries(guildDataById).map(([guildId, guildData]) => [
      guildId,
      guildData.messages,
    ]),
  ) as Record<string, ChatMessageType[]>;
  const membersByGuildId = Object.fromEntries(
    Object.entries(guildDataById).map(([guildId, guildData]) => [
      guildId,
      guildData.memberLookup,
    ]),
  ) as Record<string, Record<string, GuildMember>>;
  const mentionContextsByGuildId = Object.fromEntries(
    Object.entries(guildDataById).map(([guildId, guildData]) => [
      guildId,
      guildData.mentionContext,
    ]),
  ) as Record<string, ChatMentionContext>;

  return {
    ...resourceState,
    failedGuildIds,
    guildIdsToLoad,
    hasMessagesResponse,
    membersByGuildId,
    mentionContextsByGuildId,
    messagesByGuildId,
  };
};
