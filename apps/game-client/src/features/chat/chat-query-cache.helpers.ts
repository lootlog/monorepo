import type { QueryClient } from "@tanstack/react-query";
import { getChatControllerGetChatMessagesQueryKey } from "@lootlog/api-client/react-query/main/chat";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";

type ChatMessagesCacheUpdater =
  | ChatMessageType[]
  | ((
      messages: ChatMessageType[] | undefined,
    ) => ChatMessageType[] | undefined);

type QueryWithKey = {
  queryKey: readonly unknown[];
};

const CHAT_MESSAGES_QUERY_PATH_PATTERN = /^\/guilds\/([^/]+)\/chat-messages$/;

const getChatMessagesQueryGuildId = (query: QueryWithKey) => {
  const queryPath = query.queryKey[0];
  if (typeof queryPath !== "string") {
    return undefined;
  }

  return CHAT_MESSAGES_QUERY_PATH_PATTERN.exec(queryPath)?.[1];
};

export const isChatMessagesQuery = (query: QueryWithKey) => {
  return getChatMessagesQueryGuildId(query) !== undefined;
};

export const invalidateChatMessagesQueries = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({
    predicate: isChatMessagesQuery,
    refetchType: "active",
  });
};

export const removeChatMessagesQueriesOutsideGuilds = (
  queryClient: QueryClient,
  guildIds: readonly string[],
) => {
  const accessibleGuildIds = new Set(guildIds);

  queryClient.removeQueries({
    predicate: (query) => {
      const guildId = getChatMessagesQueryGuildId(query);
      return guildId !== undefined && !accessibleGuildIds.has(guildId);
    },
  });
};

export const removeAllChatMessagesQueries = (queryClient: QueryClient) => {
  queryClient.removeQueries({ predicate: isChatMessagesQuery });
};

export const updateChatMessagesCache = ({
  guildId,
  queryClient,
  updater,
}: {
  guildId: string;
  queryClient: QueryClient;
  updater: ChatMessagesCacheUpdater;
}) => {
  const queryKey = getChatControllerGetChatMessagesQueryKey({ guildId });
  const queryState = queryClient.getQueryState<ChatMessageType[]>(queryKey);

  if (
    queryState?.data === undefined &&
    queryState?.fetchStatus !== "fetching"
  ) {
    return;
  }

  queryClient.setQueryData<ChatMessageType[]>(queryKey, updater);
};
