import {
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { CHAT_QUERY_GC_TIME_MS } from "@/features/chat/chat.constants";
import { mergeChatMessageHistories } from "@/features/chat/chat.helpers";
import { getGuildMembersSummaryQueryOptions } from "@/hooks/api/guild-members-summary-query";
import {
  chatControllerGetChatMessages,
  getChatControllerGetChatMessagesQueryKey,
  getMembersControllerGetMeQueryKey,
  membersControllerGetMe,
  getRolesControllerGetGuildRolesQueryKey,
  rolesControllerGetGuildRoles,
  type ChatMessageResponseDtoOutput as ChatMessageType,
  type MemberSummaryResponseDtoOutput as GuildMember,
  type NullableMemberResponseDto,
  type RoleResponseDtoOutput,
} from "@lootlog/client/main";

import {
  getGuildIds,
  mapGuildMembersByUserId,
  type GuildIdentity,
} from "@/lib/api/generated-helpers";

import {
  areChatMentionContextsEqual,
  buildChatMentionContext,
  hasChatMentionToken,
  type ChatMentionContext,
} from "@/features/chat/chat-mentions.helpers";
import type { AsyncResourceState } from "@/types/async-resource-state";
import { applyCurrentChatAccess } from "../chat-access-policy";
import { useRealtimeSnapshotReady } from "@/contexts/socket-context";

type UseChatGuildDataOptions = {
  currentCharacterNick: string;
  guilds?: GuildIdentity[];
  selectedGuildId?: string;
};

type MentionContextInput = {
  currentCharacterNick: string;
  currentMember?: NullableMemberResponseDto | null;
  members?: GuildMember[];
  messages?: ChatMessageType[];
  roles?: RoleResponseDtoOutput[];
};

type MentionContextCacheEntry = MentionContextInput & {
  context: ChatMentionContext;
};

const mentionContextCache = new Map<string, MentionContextCacheEntry>();

/**
 * Every rendered row of a guild receives this context, so its identity must
 * only change when its content does. A new message from a known sender keeps
 * the previous object even though the message array is new.
 */
const getStableChatMentionContext = (
  guildId: string,
  input: MentionContextInput,
): ChatMentionContext => {
  const cached = mentionContextCache.get(guildId);

  if (
    cached &&
    cached.currentCharacterNick === input.currentCharacterNick &&
    cached.currentMember === input.currentMember &&
    cached.members === input.members &&
    cached.messages === input.messages &&
    cached.roles === input.roles
  ) {
    return cached.context;
  }

  const nextContext = buildChatMentionContext(input);

  const context =
    cached && areChatMentionContextsEqual(cached.context, nextContext)
      ? cached.context
      : nextContext;

  mentionContextCache.set(guildId, { ...input, context });

  return context;
};

const EMPTY_MESSAGES: ChatMessageType[] = [];

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
    cachedMessagesBeforeRequest?.flatMap((message) =>
      messageIdsAfterRequest.has(message.id) ? [] : [message.id],
    ),
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

/**
 * `useQueries` returns a new array on every render; combining keeps each
 * result structurally shared, so derived records keep their identity until a
 * query actually changes.
 */
const combineData = <Data>(results: UseQueryResult<Data>[]) =>
  results.map((result) => result.data);

const combineMessageQueries = (
  results: UseQueryResult<ChatMessageType[]>[],
) => ({
  data: results.map((result) => result.data),
  failed: results.map((result) => result.isError),
  firstError: results.find((result) => result.isError)?.error ?? null,
  pending: results.some((result) => result.isPending || result.isFetching),
  fetching: results.some((result) => result.isFetching),
});

export const useChatGuildData = ({
  currentCharacterNick,
  guilds,
  selectedGuildId,
}: UseChatGuildDataOptions) => {
  const queryClient = useQueryClient();
  const snapshotReady = useRealtimeSnapshotReady();
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

          return applyCurrentChatAccess(
            queryClient,
            reconcileChatMessageRefetch({
              cachedMessagesAfterRequest,
              cachedMessagesBeforeRequest,
              serverMessages,
            }),
          );
        },
        enabled: Boolean(guildId) && snapshotReady,
        gcTime: CHAT_QUERY_GC_TIME_MS,
        staleTime: 5 * 60 * 1000,
      };
    }),
    combine: combineMessageQueries,
  });

  const members = useQueries({
    queries: guildIdsToLoad.map((guildId) =>
      getGuildMembersSummaryQueryOptions({ guildId }),
    ),
    combine: combineData,
  });

  const hasMentionCandidates = messageQueries.data.map(
    (messages) =>
      messages?.some((message) => hasChatMentionToken(message.message)) ??
      false,
  );

  const currentMembers = useQueries({
    queries: guildIdsToLoad.map((guildId, index) => ({
      queryKey: getMembersControllerGetMeQueryKey({ guildId }),
      queryFn: () => membersControllerGetMe({ guildId }),
      enabled: Boolean(guildId) && hasMentionCandidates[index],
      gcTime: CHAT_QUERY_GC_TIME_MS,
      staleTime: 5 * 60 * 1000,
    })),
    combine: combineData,
  });

  const roles = useQueries({
    queries: guildIdsToLoad.map((guildId, index) => ({
      queryKey: getRolesControllerGetGuildRolesQueryKey({ guildId }),
      queryFn: () => rolesControllerGetGuildRoles({ guildId }),
      enabled: Boolean(guildId) && hasMentionCandidates[index],
      gcTime: CHAT_QUERY_GC_TIME_MS,
      staleTime: 5 * 60 * 1000,
    })),
    combine: combineData,
  });

  const hasMessagesResponse = messageQueries.data.some(
    (messages) => messages !== undefined,
  );

  const failedGuildIds = guildIdsToLoad.filter(
    (_guildId, index) => messageQueries.failed[index],
  );

  const retryFailed = () => {
    for (const guildId of failedGuildIds) {
      void queryClient.refetchQueries({
        queryKey: getChatControllerGetChatMessagesQueryKey({ guildId }),
        exact: true,
      });
    }
  };

  const resourceState: AsyncResourceState = {
    error: hasMessagesResponse ? null : messageQueries.firstError,
    initialLoading:
      guildIdsToLoad.length > 0 &&
      !hasMessagesResponse &&
      messageQueries.pending,
    refreshing: hasMessagesResponse && messageQueries.fetching,
    retry: retryFailed,
  };

  const messagesByGuildId: Record<string, ChatMessageType[]> = {};
  const membersByGuildId: Record<string, Record<string, GuildMember>> = {};
  const mentionContextsByGuildId: Record<string, ChatMentionContext> = {};

  for (const [index, guildId] of guildIdsToLoad.entries()) {
    const messages = messageQueries.data[index] ?? EMPTY_MESSAGES;

    messagesByGuildId[guildId] = messages;
    membersByGuildId[guildId] = mapGuildMembersByUserId(members[index]);
    mentionContextsByGuildId[guildId] = getStableChatMentionContext(guildId, {
      currentCharacterNick,
      currentMember: currentMembers[index],
      members: members[index],
      messages,
      roles: roles[index],
    });
  }

  return {
    ...resourceState,
    failedGuildIds,
    hasMessagesResponse,
    membersByGuildId,
    mentionContextsByGuildId,
    messagesByGuildId,
  };
};
