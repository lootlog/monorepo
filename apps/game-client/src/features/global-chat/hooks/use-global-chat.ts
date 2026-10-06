import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  globalChatControllerGetMessages,
  type GlobalChatControllerGetMessagesParams,
  type GlobalChatMessageResponse,
} from "@lootlog/client/main";
import {
  getGlobalChatWorld,
  type GlobalChatChannel,
} from "@/store/global-chat.store";
import {
  appendGlobalChatMessage,
  type GlobalChatPages,
} from "../global-chat.helpers";

export const getGlobalChatMessagesQueryKey = (channel: GlobalChatChannel) =>
  ["global-chat", "messages", channel] as const;

/**
 * One channel's history while its window is open: the newest page and older
 * pages on demand. `useGlobalChatSync` adds live messages; closing the window
 * drops the history, so a closed window keeps none in memory.
 */
export const useGlobalChat = (channel: GlobalChatChannel) => {
  const queryClient = useQueryClient();
  const queryKey = getGlobalChatMessagesQueryKey(channel);
  const world = getGlobalChatWorld(channel);

  const query = useInfiniteQuery({
    queryKey,
    // The first page has no cursor: it ends at the newest message.
    queryFn: ({ pageParam, signal }) => {
      const params: GlobalChatControllerGetMessagesParams = {};

      if (world !== undefined) params.world = world;

      if (pageParam) params.before = pageParam;

      return globalChatControllerGetMessages(params, { signal });
    },
    initialPageParam: "",
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    gcTime: 0,
  });

  const addSentMessage = (message: GlobalChatMessageResponse) => {
    queryClient.setQueryData<GlobalChatPages>(queryKey, (data) =>
      appendGlobalChatMessage(data, message),
    );
  };

  return { query, addSentMessage };
};
