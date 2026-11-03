import { replaceEqualDeep, type QueryClient } from "@tanstack/react-query";
import {
  getChatControllerGetChatMessagesQueryKey,
  type ChatMessageResponseDtoOutput as ChatMessageType,
} from "@lootlog/client/main";

type ChatMessagesCacheUpdater =
  | ChatMessageType[]
  | ((
      messages: ChatMessageType[] | undefined,
    ) => ChatMessageType[] | undefined);

type QueryWithKey = {
  queryKey: readonly unknown[];
};

const CHAT_MESSAGES_QUERY_PATH_PATTERN = /^\/guilds\/([^/]+)\/chat-messages$/;

export const getChatMessagesQueryGuildId = (query: QueryWithKey) => {
  const queryPath = query.queryKey[0];

  if (typeof queryPath !== "string") {
    return undefined;
  }

  return CHAT_MESSAGES_QUERY_PATH_PATTERN.exec(queryPath)?.[1];
};

export const isChatMessagesQuery = (query: QueryWithKey) => {
  return getChatMessagesQueryGuildId(query) !== undefined;
};

/**
 * Structural sharing for a chat history, matched by message id. The default
 * one pairs messages by index, so once the history is full and every new
 * message drops the oldest, it rebuilt every message object and the memoized
 * transcript re-rendered every row on each incoming message.
 */
export const shareChatMessages = (
  previous: readonly ChatMessageType[],
  next: ChatMessageType[],
): readonly ChatMessageType[] => {
  const previousById = new Map(
    previous.map((message) => [message.id, message]),
  );

  const shared = next.map((message) => {
    const previousMessage = previousById.get(message.id);

    return previousMessage
      ? replaceEqualDeep(previousMessage, message)
      : message;
  });

  return shared.length === previous.length &&
    shared.every((message, index) => message === previous[index])
    ? previous
    : shared;
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

  if (queryState?.isInvalidated) {
    void queryClient.invalidateQueries({
      queryKey,
      exact: true,
      refetchType: "none",
    });
  }
};
