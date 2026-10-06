import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  globalChatControllerGetMessages,
  type GlobalChatMessageResponse,
} from "@lootlog/client/main";
import type { GlobalChatMessage } from "@lootlog/schema/chat";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import {
  appendGlobalChatMessage,
  type GlobalChatPages,
} from "../global-chat.helpers";

const GLOBAL_CHAT_QUERY_KEY = ["global-chat", "messages"] as const;

/**
 * The global chat while its window is open: the newest page, older pages on
 * demand and live messages. Closing the window drops the history and the
 * gateway subscription, so a closed window costs the game nothing.
 */
export const useGlobalChat = () => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: GLOBAL_CHAT_QUERY_KEY,
    // The first page has no cursor: it ends at the newest message.
    queryFn: ({ pageParam, signal }) =>
      globalChatControllerGetMessages(
        pageParam ? { before: pageParam } : undefined,
        { signal },
      ),
    initialPageParam: "",
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    gcTime: 0,
  });

  // Follows the socket's join lifecycle, which React state does not mirror.
  useEffect(() => {
    if (!socket) return;

    const onMessage = (message: GlobalChatMessage) => {
      queryClient.setQueryData<GlobalChatPages>(GLOBAL_CHAT_QUERY_KEY, (data) =>
        appendGlobalChatMessage(data, { ...message, isOwn: false }),
      );
    };

    // Refetches what was sent while the window was not subscribed.
    const onSubscribed = () => {
      void queryClient.invalidateQueries({ queryKey: GLOBAL_CHAT_QUERY_KEY });
    };

    socket.on(GatewayEvent.GLOBAL_CHAT_MESSAGE, onMessage);
    socket.on(GatewayEvent.GLOBAL_CHAT_SUBSCRIBED, onSubscribed);
    socket.setGlobalChatSubscribed(true);

    return () => {
      socket.setGlobalChatSubscribed(false);
      socket.off(GatewayEvent.GLOBAL_CHAT_MESSAGE, onMessage);
      socket.off(GatewayEvent.GLOBAL_CHAT_SUBSCRIBED, onSubscribed);
    };
  }, [socket, queryClient]);

  const addSentMessage = (message: GlobalChatMessageResponse) => {
    queryClient.setQueryData<GlobalChatPages>(GLOBAL_CHAT_QUERY_KEY, (data) =>
      appendGlobalChatMessage(data, message),
    );
  };

  return { query, addSentMessage };
};
