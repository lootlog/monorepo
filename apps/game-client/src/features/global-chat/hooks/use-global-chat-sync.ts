import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { GlobalChatMessage, GlobalChatStats } from "@lootlog/schema/chat";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useAccessibleGuilds } from "@/hooks/api/use-accessible-guilds";
import {
  getGlobalChatChannel,
  useGlobalChatStore,
  type GlobalChatChannel,
} from "@/store/global-chat.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  appendGlobalChatMessage,
  fromDeliveredGlobalChatMessage,
  removeGlobalChatMessage,
  setGlobalChatPinned,
  type GlobalChatPages,
} from "../global-chat.helpers";
import { useGlobalChatChannel } from "./use-global-chat-channel";
import { getGlobalChatMessagesQueryKey } from "./use-global-chat";

/**
 * Follows the selected global chat channel for as long as the game runs, so
 * the quick access button can count what arrives while the window is closed.
 * Live messages, moderation and counts land in the open window's history;
 * with the window closed there is no history to update.
 */
export const useGlobalChatSync = () => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const isMember = (useAccessibleGuilds().data?.length ?? 0) > 0;
  const { channel } = useGlobalChatChannel({ loadWorlds: false });
  const windowOpen = useWindowsStore((state) => state["global-chat"].open);
  const clearUnread = useGlobalChatStore((state) => state.clearUnread);

  useEffect(() => {
    if (windowOpen) clearUnread();
  }, [windowOpen, clearUnread]);

  // Follows the socket's join lifecycle, which React state does not mirror.
  useEffect(() => {
    if (!socket || !isMember) return;

    const update = (
      world: string | undefined,
      change: (
        data: GlobalChatPages | undefined,
      ) => GlobalChatPages | undefined,
    ) =>
      queryClient.setQueryData<GlobalChatPages>(
        getGlobalChatMessagesQueryKey(getGlobalChatChannel(world)),
        change,
      );

    const onMessage = (message: GlobalChatMessage) => {
      update(message.world, (data) =>
        appendGlobalChatMessage(data, fromDeliveredGlobalChatMessage(message)),
      );

      if (
        getGlobalChatChannel(message.world) === channel &&
        !useWindowsStore.getState()["global-chat"].open
      )
        useGlobalChatStore.getState().addUnread();
    };

    const onDeleted = ({ world, id }: { world?: string; id: string }) => {
      update(world, (data) => removeGlobalChatMessage(data, id));
    };

    const onPinned = ({
      world,
      message,
    }: {
      world?: string;
      message: GlobalChatMessage | null;
    }) => {
      update(world, (data) => setGlobalChatPinned(data, message));
    };

    const onStats = (stats: GlobalChatStats) => {
      if (getGlobalChatChannel(stats.world) === channel)
        useGlobalChatStore.getState().setStats(stats);
    };

    // Refetches what was sent while the channel was not followed.
    const onSubscribed = (subscribed: GlobalChatChannel) => {
      void queryClient.invalidateQueries({
        queryKey: getGlobalChatMessagesQueryKey(subscribed),
      });
    };

    socket.on(GatewayEvent.GLOBAL_CHAT_MESSAGE, onMessage);
    socket.on(GatewayEvent.GLOBAL_CHAT_DELETED, onDeleted);
    socket.on(GatewayEvent.GLOBAL_CHAT_PINNED, onPinned);
    socket.on(GatewayEvent.GLOBAL_CHAT_STATS, onStats);
    socket.on(GatewayEvent.GLOBAL_CHAT_SUBSCRIBED, onSubscribed);
    socket.followGlobalChat(channel);

    return () => {
      socket.followGlobalChat(undefined);
      socket.off(GatewayEvent.GLOBAL_CHAT_MESSAGE, onMessage);
      socket.off(GatewayEvent.GLOBAL_CHAT_DELETED, onDeleted);
      socket.off(GatewayEvent.GLOBAL_CHAT_PINNED, onPinned);
      socket.off(GatewayEvent.GLOBAL_CHAT_STATS, onStats);
      socket.off(GatewayEvent.GLOBAL_CHAT_SUBSCRIBED, onSubscribed);
    };
  }, [socket, queryClient, channel, isMember]);
};
