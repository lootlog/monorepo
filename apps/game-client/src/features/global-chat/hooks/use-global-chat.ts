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

export const useGlobalChat = (channel: GlobalChatChannel) => {
  const queryClient = useQueryClient();
  const queryKey = getGlobalChatMessagesQueryKey(channel);
  const world = getGlobalChatWorld(channel);

  const query = useInfiniteQuery({
    queryKey,
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
